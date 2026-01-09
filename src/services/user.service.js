import bcrypt from "bcryptjs";
import { prismaClient } from "../app/database.js";
import { ResponseError } from "../errors/response.error.js";
import { createNewUser, loginUser } from "../validators/user.validation.js";
import { validate } from "../validators/validator.js";
import tokenUtil from "../utils/token.util.js";
import deviceUtil from "../utils/device.util.js";

const login = async (reqBody, userAgent, ipAddress) => {
  reqBody = validate(loginUser, reqBody);

  const { identifier, password } = reqBody;

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

  const roles = user.userRoles.map((ur) => ur.role.name);

  const accessToken = generateAccessToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    roles: roles,
  });

  const refreshToken = tokenUtil.generateAccessToken();
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
      expiresAt: tokenUtil.getRefreshTokenExpiry(),
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
        name: user.name,
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
        full_name: validatedData.full_name,
        email: validatedData.email,
        password: hashedPassword,
        is_active: true, // Auto-activate for now or follow business logic
      },
      include: {
        userRoles: {
          include: { role: true },
        },
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
        full_name: result.full_name,
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

export default { registration, login, logout };
