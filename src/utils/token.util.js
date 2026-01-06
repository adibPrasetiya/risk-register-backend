import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prismaClient } from '../app/database.js';
import { parseDeviceName, extractIpAddress, generateDeviceId } from './device.util.js';
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from '../config/constant.js';

const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId || payload.id,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const updateOrCreateSession = async (userId, req) => {
  const userAgent = req.get('User-Agent');
  const ipAddress = extractIpAddress(req);
  const refreshToken = generateRefreshToken();
  const deviceName = parseDeviceName(userAgent);
  const deviceId = generateDeviceId(userAgent, ipAddress);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prismaClient.session.upsert({
    where: {
      userId: userId,
    },
    update: {
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      deviceId: deviceId,
      deviceName: deviceName,
      userAgent: userAgent,
      ipAddress: ipAddress,
    },
    create: {
      userId: userId,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      deviceId: deviceId,
      deviceName: deviceName,
      userAgent: userAgent,
      ipAddress: ipAddress,
    },
  });

  return refreshToken;
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  updateOrCreateSession,
  verifyAccessToken,
  decodeToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
