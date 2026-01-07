import bcrypt from 'bcryptjs';
import { prismaClient } from '../app/database.js';
import { ResponseError } from '../errors/response.error.js';
import { createNewUser, loginUser } from '../validators/user.validation.js';
import { validate } from '../validators/validator.js';
import tokenUtil from '../utils/token.util.js';

const login = async (reqBody, req) => {
  const validatedData = validate(loginUser, reqBody);

  const user = await prismaClient.user.findFirst({
    where: {
      OR: [
        { username: validatedData.username },
        { email: validatedData.username },
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

  if (!user.is_active) {
    throw new ResponseError(403, 'Akun Anda belum aktif. Silakan hubungi administrator.');
  }

  // Create JWT Payload
  const jwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    roles: user.userRoles.map((ur) => ur.role.name),
  };

  const accessToken = tokenUtil.generateAccessToken(jwtPayload);
  const refreshToken = await tokenUtil.updateOrCreateSession(user.id, req);

  return {
    accessToken,
    refreshToken,
  };
};

const registration = async (reqBody, req) => {
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
    userId: result.id,
    username: result.username,
    email: result.email,
    roles: ['USER'], // Or fetch from result.userRoles if needed
  };

  const accessToken = tokenUtil.generateAccessToken(jwtPayload);
  const refreshToken = await tokenUtil.updateOrCreateSession(result.id, req);

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
  const session = await prismaClient.session.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!session) {
    throw new ResponseError(404, 'Session not found');
  }

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
