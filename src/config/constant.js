import { config } from "dotenv";

config();

export const APP_PORT = parseInt(process.env.APP_PORT || "3000", 10);
export const NODE_ENV = process.env.NODE_ENV;
export const REFRESH_TOKEN_COOKIE_MAX_AGE =
  NODE_ENV === "production"
    ? 1 * 60 * 60 * 1000 // 1 hour
    : 7 * 24 * 60 * 60 * 1000; // 7 days
export const ACCESS_TOKEN_EXPIRY = NODE_ENV === "production" ? "15m" : "1d";
export const REFRESH_TOKEN_EXPIRY = NODE_ENV === "production" ? "1d" : "7d";

export const PASSWORD_EXPIRE_DAYS = parseInt(process.env.PASSWORD_EXPIRE_DAYS || "90", 10);
