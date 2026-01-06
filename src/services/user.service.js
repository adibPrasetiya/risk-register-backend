import bcrypt from 'bcryptjs';
import { prismaClient } from '../app/database.js';
import { ResponseError } from '../errors/response.error.js';
import { createNewUser } from '../validators/user.validation.js';
import { validate } from '../validators/validator.js';

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

  const user = await prismaClient.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: validatedData.username,
        full_name: validatedData.full_name,
        email: validatedData.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        is_active: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

    await tx.userRole.create({
      data: {
        userId: newUser.id,
        roleId: userRole.id,
      },
    });

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.full_name,
      email: newUser.email,
      isActive: newUser.is_active,
      isVerified: newUser.is_verified,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    };
  });

  return {
    message: 'Registrasi user berhasil',
    data: user,
  };
};

export default { registration };
