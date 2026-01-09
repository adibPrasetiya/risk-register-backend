import { config } from "dotenv";

config();

export const APP_PORT = parseInt(process.env.APP_PORT || "3000", 10);
export const NODE_ENV = process.env.NODE_ENV;
export const REFRESH_TOKEN_COOKIE_MAX_AGE =
  NODE_ENV === "production"
    ? 1 * 60 * 60 * 1000 // 1 hour
    : 7 * 24 * 60 * 60 * 1000; // 7 days
export const JWT_SECRET = process.env.JWT_SECRET || "secret_key_change_me";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_key_change_me";
export const ACCESS_TOKEN_EXPIRY = NODE_ENV === "production" ? "15m" : "1d";
export const REFRESH_TOKEN_EXPIRY = NODE_ENV === "production" ? "1d" : "7d";
