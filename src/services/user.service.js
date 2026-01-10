import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prismaClient } from "../app/database.js";
import { ResponseError } from "../errors/response.error.js";
import {
  createNewUser,
  loginUser,
  updateUserProfile,
  updatePassword as updatePasswordVal,
  verifyTotp,
  resetPasswordRequest as resetPasswordRequestVal,
  adminCompleteResetPassword as adminCompleteResetPasswordVal,
  adminVerifyUser as adminVerifyUserVal,
} from "../validators/user.validation.js";
import { validate } from "../validators/validator.js";
import tokenUtil, { getRefreshTokenExpiry, getAccessTokenExpiry } from "../utils/token.util.js";
import deviceUtil from "../utils/device.util.js";
import { PASSWORD_EXPIRE_DAYS } from "../config/constant.js";

const isPasswordExpired = (user) => {
  if (!user.password_changed_at) return false;
  const diffMs = Date.now() - user.password_changed_at.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > PASSWORD_EXPIRE_DAYS;
};

const registration = async (reqBody) => {
  const validatedData = validate(createNewUser, reqBody);

  const fullName = validatedData.fullName ?? validatedData.full_name ?? null;
  if (!fullName) {
    throw new ResponseError(400, "fullName wajib diisi");
  }

  const existingUsername = await prismaClient.user.findUnique({
    where: { username: validatedData.username },
  });
  if (existingUsername) {
    throw new ResponseError(409, `Username ${validatedData.username} sudah terdaftar.`);
  }

  const existingEmail = await prismaClient.user.findUnique({
    where: { email: validatedData.email },
  });
  if (existingEmail) {
    throw new ResponseError(409, `Email ${validatedData.email} sudah terdaftar.`);
  }

  const userRole = await prismaClient.role.findUnique({
    where: { name: "USER" },
  });

  // Proses bisnis: cek apakah role USER tersedia; jika tidak, gagal pendaftaran
  if (!userRole) {
    throw new ResponseError(500, "Gagal melakukan pendaftaran: role USER belum tersedia.");
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const result = await prismaClient.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        // Proses bisnis: isActive false & isVerified false saat registrasi
        is_active: false,
        is_verified: false,
        password_changed_at: new Date(),
        profile: {
          create: {
            fullName: fullName,
          },
        },
      },
      include: {
        userRoles: { include: { role: true } },
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
    message: "Pendaftaran berhasil. Menunggu verifikasi admin.",
    data: {
      user: {
        id: result.id,
        username: result.username,
        fullName: result.profile?.fullName,
        email: result.email,
        is_active: result.is_active,
        is_verified: result.is_verified,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    },
  };
};

const login = async (reqBody, userAgent, ipAddress) => {
  reqBody = validate(loginUser, reqBody);
  const { username: identifier, password, totpCode } = reqBody;

  const user = await prismaClient.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
    include: {
      userRoles: { include: { role: true } },
      profile: true,
    },
  });

  if (!user) {
    throw new ResponseError(401, "Username/email atau password salah");
  }

  // Proses bisnis: akun harus diverifikasi admin
  if (!user.is_verified) {
    throw new ResponseError(403, "Akun belum diverifikasi");
  }

  // Tetap menjaga kontrol akun aktif
  if (!user.is_active) {
    throw new ResponseError(403, "Akun tidak aktif. Silakan hubungi administrator.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ResponseError(401, "Username/email atau password salah");
  }

  // Proses bisnis: password expired -> blokir login
  if (isPasswordExpired(user)) {
    throw new ResponseError(403, "Password expired. Hubungi Admin");
  }

  // Proses bisnis: jika 2FA aktif, minta TOTP dulu
  if (user.totp_enabled) {
    if (!totpCode) {
      return {
        message: "TOTP diperlukan",
        data: { requires2FA: true },
      };
    }

    const { token: validatedTotp } = validate(verifyTotp, { token: totpCode });

    const isValidTOTP = authenticator.verify({
      token: validatedTotp,
      secret: user.totp_secret,
    });

    if (!isValidTOTP) {
      throw new ResponseError(401, "TOTP tidak valid");
    }
  }

  const roles = user.userRoles.map((ur) => ur.role.name);

  // Opaque Access Token
  const accessToken = tokenUtil.generateAccessToken();
  const accessTokenExpiry = getAccessTokenExpiry();

  const refreshToken = tokenUtil.generateRefreshToken();
  const hashedRefreshToken = tokenUtil.hashRefreshToken(refreshToken);

  const deviceId = deviceUtil.generateDeviceId(userAgent, ipAddress);
  const deviceName = deviceUtil.parseDeviceName(userAgent);

  // Proses bisnis: jika session sudah ada -> update, jika belum -> create
  await prismaClient.session.upsert({
    where: { userId: user.id },
    update: {
      accessToken,
      accessTokenExpiresAt: accessTokenExpiry,
      refreshToken: hashedRefreshToken,
      deviceId,
      deviceName,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
    create: {
      userId: user.id,
      accessToken,
      accessTokenExpiresAt: accessTokenExpiry,
      refreshToken: hashedRefreshToken,
      deviceId,
      deviceName,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  let nextAction = "DASHBOARD";
  if (user.must_change_password) nextAction = "MUST_CHANGE_PASSWORD";
  else if (!user.profile) nextAction = "PROFILE_REQUIRED";

  return {
    message: "Login berhasil",
    data: {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.profile?.fullName,
        email: user.email,
        isActive: user.is_active,
        isVerified: user.is_verified,
        mustChangePassword: user.must_change_password,
        hasProfile: Boolean(user.profile),
        roles,
      },
      accessToken,
      refreshToken,
      nextAction,
    },
  };
};

const logout = async (userId) => {
  // Proses bisnis: hapus session aktif. Jika tidak ada, tetap anggap logout berhasil.
  await prismaClient.session.deleteMany({
    where: { userId },
  });

  return { message: "Logout berhasil" };
};

const updateProfile = async (userId, data) => {
  const validatedData = validate(updateUserProfile, data);
  const { fullName, bio, avatar, email } = validatedData;

  if (email) {
    const existing = await prismaClient.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ResponseError(409, "Email sudah digunakan");
    }
  }

  const updatedUser = await prismaClient.user.update({
    where: { id: userId },
    data: {
      email: email,
      profile: {
        upsert: {
          create: { fullName, bio, avatar },
          update: { fullName, bio, avatar },
        },
      },
    },
    include: { profile: true },
  });

  return {
    message: "Profile berhasil diperbarui",
    data: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      profile: updatedUser.profile,
    },
  };
};

const updatePassword = async (userId, reqBody) => {
  const validatedData = validate(updatePasswordVal, reqBody);

  const currentPassword =
    validatedData.currentPassword ?? validatedData.oldPassword ?? null;

  if (!currentPassword) {
    throw new ResponseError(400, "currentPassword wajib diisi");
  }

  const { newPassword } = validatedData;

  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ResponseError(404, "User tidak ditemukan");
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    // Proses bisnis: response password salah
    throw new ResponseError(401, "Password salah");
  }

  // Proses bisnis: password baru tidak boleh sama dengan password lama
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    throw new ResponseError(400, "Password baru tidak boleh sama dengan password lama");
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await prismaClient.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        must_change_password: false,
        password_changed_at: new Date(),
      },
    });

    // Proses bisnis: hapus session aktif lalu user login kembali
    await tx.session.deleteMany({ where: { userId } });
  });

  return { message: "Password berhasil diperbarui. Silakan login kembali." };
};

// --- Reset password (user request -> admin validate/complete) ---

const requestResetPassword = async (reqBody) => {
  const { identifier } = validate(resetPasswordRequestVal, reqBody);

  const user = await prismaClient.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  // Proses bisnis: jangan bocorkan apakah terdaftar atau tidak; selalu respons sama
  if (user) {
    await prismaClient.passwordResetRequest.create({
      data: {
        userId: user.id,
        identifier,
        status: "PENDING",
      },
    });
  }

  return { message: "Reset password menunggu verifikasi admin" };
};

const listResetPasswordRequests = async (status) => {
  const where = status ? { status } : {};
  const requests = await prismaClient.passwordResetRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { id: true, username: true, email: true } },
      validatedBy: { select: { id: true, username: true, email: true } },
    },
  });

  return { message: "OK", data: requests };
};

const completeResetPassword = async (adminId, reqBody) => {
  const validated = validate(adminCompleteResetPasswordVal, reqBody);

  const admin = await prismaClient.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new ResponseError(401, "Unauthorized");

  const adminPassValid = await bcrypt.compare(
    validated.adminCurrentPassword,
    admin.password
  );
  if (!adminPassValid) {
    // Proses bisnis: respons password admin salah
    throw new ResponseError(401, "Password salah");
  }

  const request = await prismaClient.passwordResetRequest.findUnique({
    where: { id: validated.requestId },
    include: { user: true },
  });

  if (!request || !request.userId || !request.user) {
    throw new ResponseError(404, "Permohonan reset password tidak ditemukan");
  }

  if (request.status !== "PENDING") {
    throw new ResponseError(400, "Permohonan reset password sudah diproses");
  }

  const hashed = await bcrypt.hash(validated.newPassword, 10);

  await prismaClient.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: request.userId },
      data: {
        password: hashed,
        must_change_password: true,
        password_changed_at: new Date(),
      },
    });

    // Proses bisnis: hapus session aktif user jika ada
    await tx.session.deleteMany({ where: { userId: request.userId } });

    await tx.passwordResetRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        validatedById: adminId,
        validatedAt: new Date(),
        completedAt: new Date(),
      },
    });
  });

  return { message: "Reset password berhasil diproses" };
};

// --- Admin verify / activate user (supaya sesuai proses login: akun diverifikasi admin) ---
const verifyUserByAdmin = async (adminId, userId, reqBody) => {
  const validated = validate(adminVerifyUserVal, reqBody);

  // Optional: Pastikan adminId exists (middleware sudah cek role)
  const updated = await prismaClient.user.update({
    where: { id: userId },
    data: {
      ...(validated.is_active !== undefined ? { is_active: validated.is_active } : {}),
      ...(validated.is_verified !== undefined ? { is_verified: validated.is_verified } : {}),
    },
    select: {
      id: true,
      username: true,
      email: true,
      is_active: true,
      is_verified: true,
    },
  });

  return { message: "User berhasil diperbarui", data: updated };
};

// 2FA utilities (tetap)
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

  await prismaClient.user.update({
    where: { id: userId },
    data: { totp_secret: secret },
  });

  return { secret, qrCode };
};

const enable2FA = async (userId, token) => {
  const { token: validatedToken } = validate(verifyTotp, { token });
  const user = await prismaClient.user.findUnique({ where: { id: userId } });

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
    data: { totp_enabled: false, totp_secret: null },
  });
  return { message: "2FA disabled successfully" };
};

export default {
  registration,
  login,
  logout,
  updateProfile,
  updatePassword,
  requestResetPassword,
  listResetPasswordRequests,
  completeResetPassword,
  verifyUserByAdmin,
  generate2FA,
  enable2FA,
  disable2FA,
};
