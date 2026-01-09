import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from "../config/constant.js";
import { JwtError } from "../errors/jwt.error.js";

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
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new JwtError(403, "Invalid or expired access token");
  }
};

export const getRefreshTokenExpiry = () => {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + REFRESH_TOKEN_EXPIRY);
  return expiryDate;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  hashRefreshToken,
};
