import crypto from "crypto";
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from "../config/constant.js";

const generateAccessToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const getAccessTokenExpiry = () => {
  const expiryDate = new Date();
  // Handle '15m', '1h', etc. from ACCESS_TOKEN_EXPIRY
  // Simple parsing: assume it ends with 'm' for minutes or 'h' for hours or 'd' for days
  const timeStr = ACCESS_TOKEN_EXPIRY;
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1));

  if (unit === 'm') expiryDate.setMinutes(expiryDate.getMinutes() + value);
  else if (unit === 'h') expiryDate.setHours(expiryDate.getHours() + value);
  else if (unit === 'd') expiryDate.setDate(expiryDate.getDate() + value);
  else expiryDate.setMinutes(expiryDate.getMinutes() + 15); // Default fallback

  return expiryDate;
};

export const getRefreshTokenExpiry = () => {
  const expiryDate = new Date();
  // Handle '7d', '1d', etc.
  const hours = REFRESH_TOKEN_EXPIRY.endsWith("d")
    ? parseInt(REFRESH_TOKEN_EXPIRY.slice(0, -1)) * 24
    : parseInt(REFRESH_TOKEN_EXPIRY);
    
  expiryDate.setHours(expiryDate.getHours() + hours);
  return expiryDate;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getAccessTokenExpiry,
  getRefreshTokenExpiry,
};
