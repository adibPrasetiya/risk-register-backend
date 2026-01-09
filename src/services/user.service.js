import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prismaClient } from "../app/database.js";
import { ResponseError } from "../errors/response.error.js";
import { createNewUser, loginUser, updateUserProfile, changeUserPassword, verifyTotp, adminResetPassword as adminResetPasswordVal } from "../validators/user.validation.js";
import { validate } from "../validators/validator.js";
import tokenUtil, { getRefreshTokenExpiry } from "../utils/token.util.js";
import deviceUtil from "../utils/device.util.js";

const login = async (reqBody, userAgent, ipAddress) => {
  reqBody = validate(loginUser, reqBody);

  const { username: identifier, password } = reqBody;

  // Cari user berdasarkan username atau email
  const user = await prismaClient.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      profile: true,
    },
  });

  if (!user) {
    throw new ResponseError(401, "Username/email atau password salah.");
  }

  // Check apakah user aktif
  if (!user.is_active) {
    throw new ResponseError(
      403,
      "Akun Anda tidak aktif. Silakan hubungi administrator."
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ResponseError(401, "Username/email atau password salah.");
  }

  // 2FA Check
  if (user.totp_enabled) {
    if (!reqBody.totpCode) {
      throw new ResponseError(403, "TOTP code required");
    }

    const isValidTOTP = authenticator.verify({
      token: reqBody.totpCode,
      secret: user.totp_secret,
    });

    if (!isValidTOTP) {
      throw new ResponseError(401, "Invalid TOTP code");
    }
  }

  const roles = user.userRoles.map((ur) => ur.role.name);

  const accessToken = tokenUtil.generateAccessToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    roles: roles,
  });

  const refreshToken = tokenUtil.generateRefreshToken();
  const hashedRefreshToken = tokenUtil.hashRefreshToken(refreshToken);

  const deviceId = deviceUtil.generateDeviceId(userAgent, ipAddress);
  const deviceName = deviceUtil.parseDeviceName(userAgent);

  await prismaClient.session.upsert({
    where: {
      userId: user.id,
    },
    update: {
      refreshToken: hashedRefreshToken,
      deviceId: deviceId,
      deviceName: deviceName,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
    create: {
      userId: user.id,
      refreshToken: hashedRefreshToken,
      deviceId: deviceId,
      deviceName: deviceName,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    message: "Login berhasil",
    data: {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.profile?.fullName,
        email: user.email,
        isActive: user.is_active,
        isVerified: user.is_verified,
        roles: roles,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    },
  };
};

const registration = async (reqBody) => {
  const validatedData = validate(createNewUser, reqBody);

  const existingUsername = await prismaClient.user.findUnique({
    where: {
      username: validatedData.username,
    },
  });

  if (existingUsername) {
    throw new ResponseError(
      409,
      `Username ${validatedData.username} sudah digunakan.`
    );
  }

  const existingEmail = await prismaClient.user.findUnique({
    where: {
      email: validatedData.email,
    },
  });

  if (existingEmail) {
    throw new ResponseError(
      409,
      `Email ${validatedData.email} sudah digunakan.`
    );
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const userRole = await prismaClient.role.findUnique({
    where: {
      name: "USER",
    },
  });

  if (!userRole) {
    throw new ResponseError(
      500,
      "Role default USER tidak ditemukan. Silakan seed database terlebih dahulu."
    );
  }

  const result = await prismaClient.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        is_active: true, // Auto-activate for now or follow business logic
        profile: {
          create: {
            fullName: validatedData.full_name,
          },
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
        profile: true,
      },
    });

    await tx.userRole.create({
      data: {
        userId: newUser.id,
        roleId: userRole.id,
      },
    });

    return newUser;
  });

  return {
    message: "Registrasi user berhasil",
    data: {
      user: {
        id: result.id,
        username: result.username,
        full_name: result.profile?.fullName,
        email: result.email,
        is_active: result.is_active,
        is_verified: result.is_verified,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    },
  };
};

const logout = async (userId) => {
  const session = await prismaClient.session.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!session) {
    throw new ResponseError(404, "Session not found");
  }

  await prismaClient.session.delete({
    where: {
      userId: userId,
    },
  });

  return {
    message: "Logout berhasil",
  };
};

const generate2FA = async (userId) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ResponseError(404, "User not found");
  }

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, "RiskRegisterApp", secret);
  const qrCode = await QRCode.toDataURL(otpauth);

  // Temporarily store secret or just return it? 
  // Ideally, we shouldn't save it until confirmed. 
  // But for simplicity, we can return it and save it only on confirmation (enable2FA).
  // OR save it to DB but keep is_enabled false until verified.
  
  await prismaClient.user.update({
    where: { id: userId },
    data: { totp_secret: secret },
  });

  return {
    secret,
    qrCode,
  };
};

const enable2FA = async (userId, token) => {
  const { token: validatedToken } = validate(verifyTotp, { token });
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.totp_secret) {
    throw new ResponseError(400, "2FA setup not initiated");
  }

  const isValid = authenticator.verify({
    token: validatedToken,
    secret: user.totp_secret,
  });

  if (!isValid) {
    throw new ResponseError(400, "Invalid TOTP token");
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: { totp_enabled: true },
  });

  return { message: "2FA enabled successfully" };
};

const disable2FA = async (userId) => {
  await prismaClient.user.update({
    where: { id: userId },
    data: {
      totp_enabled: false,
      totp_secret: null,
    },
  });
  return { message: "2FA disabled successfully" };
};

const updateProfile = async (userId, data) => {
  const validatedData = validate(updateUserProfile, data);
  const { fullName, bio, avatar, email } = validatedData; // Allow email update too?

  // If email update is requested, check uniqueness
  if (email) {
    const existing = await prismaClient.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ResponseError(409, "Email already in use");
    }
  }

  const updatedUser = await prismaClient.user.update({
    where: { id: userId },
    data: {
      email: email, // Optional update
      profile: {
        upsert: {
          create: {
            fullName,
            bio,
            avatar,
          },
          update: {
            fullName,
            bio,
            avatar,
          },
        },
      },
    },
    include: {
      profile: true,
    },
  });

  return {
    message: "Profile updated successfully",
    data: updatedUser,
  };
};

const adminResetPassword = async (identifier) => {
  const { identifier: validatedIdentifier } = validate(adminResetPasswordVal, { identifier });
  const user = await prismaClient.user.findFirst({
    where: {
      OR: [{ username: validatedIdentifier }, { email: validatedIdentifier }],
    },
  });

  if (!user) {
    throw new ResponseError(404, "User not found");
  }

  const defaultPassword = "DefaultPassword123!"; // In real app, generate random
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prismaClient.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      must_change_password: true,
    },
  });

  // Simulate sending email
  // console.log(`[Email Service] Password reset for ${user.email}. New password: ${defaultPassword}`);

  return {
    message: "Password reset successfully. Default password sent to user.",
    data: { defaultPassword }, // Returning for MVP/CLI purpose
  };
};

const changePassword = async (userId, reqBody) => {
  const validatedData = validate(changeUserPassword, reqBody);
  const { oldPassword, newPassword } = validatedData;

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ResponseError(404, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new ResponseError(401, "Password lama salah");
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await prismaClient.user.update({
    where: { id: userId },
    data: {
      password: hashedNewPassword,
      must_change_password: false,
      password_changed_at: new Date(),
    },
  });

  return { message: "Password updated successfully" };
};

export default { 
  registration, 
  login, 
  logout,
  generate2FA,
  enable2FA,
  disable2FA,
  updateProfile,
  changePassword,
  adminResetPassword
};
