import bcrypt from 'bcryptjs';
import { prismaClient } from '../app/database.js';
import { ResponseError } from '../errors/response.error.js';
import { createNewUser, loginUser } from '../validators/user.validation.js';
import { validate } from '../validators/validator.js';
import tokenUtil from '../utils/token.util.js';

const updateOrCreateSession = async (userId, userAgentInfo) => {
  const refreshToken = tokenUtil.generateRefreshToken({ id: userId });
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prismaClient.session.upsert({
    where: {
      userId: userId,
    },
    update: {
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      deviceId: userAgentInfo.deviceId || 'unknown',
      deviceName: userAgentInfo.deviceName,
      userAgent: userAgentInfo.userAgent,
      ipAddress: userAgentInfo.ipAddress,
    },
    create: {
      userId: userId,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      deviceId: userAgentInfo.deviceId || 'unknown',
      deviceName: userAgentInfo.deviceName,
      userAgent: userAgentInfo.userAgent,
      ipAddress: userAgentInfo.ipAddress,
    },
  });

  return refreshToken;
};

const login = async (reqBody, userAgentInfo = {}) => {
  const validatedData = validate(loginUser, reqBody);

  const user = await prismaClient.user.findFirst({
    where: {
      OR: [
        { username: validatedData.identifier },
        { email: validatedData.identifier },
      ],
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
    throw new ResponseError(401, 'Username atau password salah');
  }

  const isPasswordValid = await bcrypt.compare(
    validatedData.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new ResponseError(401, 'Username atau password salah');
  }

  // Create JWT Payload
  const jwtPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.userRoles.map((ur) => ur.role.name),
  };

  const accessToken = tokenUtil.generateAccessToken(jwtPayload);
  const refreshToken = await updateOrCreateSession(user.id, userAgentInfo);

  return {
    accessToken,
    refreshToken,
  };
};

const registration = async (reqBody, userAgentInfo = {}) => {
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
    throw new ResponseError(409, `Email ${validatedData.email} sudah digunakan.`);
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const userRole = await prismaClient.role.findUnique({
    where: {
      name: 'USER',
    },
  });

  if (!userRole) {
    throw new ResponseError(
      500,
      'Role default USER tidak ditemukan. Silakan seed database terlebih dahulu.'
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
            include: { role: true }
        }
      }
    });

    await tx.userRole.create({
      data: {
        userId: newUser.id,
        roleId: userRole.id,
      },
    });

    return newUser;
  });

  // Auto-login (Generate Tokens)
  const jwtPayload = {
    id: result.id,
    username: result.username,
    email: result.email,
    roles: ['USER'], // Or fetch from result.userRoles if needed
  };

  const accessToken = tokenUtil.generateAccessToken(jwtPayload);
  const refreshToken = await updateOrCreateSession(result.id, userAgentInfo);

  return {
    message: 'Registrasi user berhasil',
    data: {
      user: {
        id: result.id,
        username: result.username,
        name: result.full_name,
        email: result.email,
        isActive: result.is_active,
        isVerified: result.is_verified,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      },
      accessToken,
      refreshToken
    },
  };
};

const logout = async (userId) => {
  await prismaClient.session.delete({
    where: {
      userId: userId,
    },
  });
  
  return {
    message: 'Logout berhasil',
  };
};

export default { registration, login, logout };
