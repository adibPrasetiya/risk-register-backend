import userService from "../services/user.service.js";
import { NODE_ENV, REFRESH_TOKEN_COOKIE_MAX_AGE } from "../config/constant.js";
import deviceUtil from "../utils/device.util.js";

const create = async (req, res, next) => {
  try {
    const result = await userService.registration(req.body);
    res.status(201).json({ message: result.message, data: result.data });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const userAgent = req.headers["user-agent"] || "unknown";
    const ipAddress = deviceUtil.extractIpAddress(req);

    const result = await userService.login(req.body, userAgent, ipAddress);

    // Proses bisnis 2FA: jika perlu TOTP, jangan buat session/cookie
    if (result?.data?.requires2FA) {
      return res.status(200).json({
        message: result.message,
        data: result.data,
      });
    }

    return res
      .cookie("refreshToken", result.data.refreshToken, {
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
      })
      .status(200)
      .json({
        message: result.message,
        data: {
          user: result.data.user,
          accessToken: result.data.accessToken,
          nextAction: result.data.nextAction,
        },
      });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await userService.logout(req.user.id);
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logout berhasil" });
  } catch (error) {
    next(error);
  }
};

// --- Profile ---
const updateProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// --- Update password (sesuai proses bisnis) ---
const updatePassword = async (req, res, next) => {
  try {
    const result = await userService.updatePassword(req.user.id, req.body);
    // Proses bisnis: hapus session aktif -> user dialihkan ke login
    res.clearCookie("refreshToken");
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// --- Reset password (request dari user, public) ---
const requestResetPassword = async (req, res, next) => {
  try {
    const result = await userService.requestResetPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// --- Admin: list & complete reset password ---
const listResetPasswordRequests = async (req, res, next) => {
  try {
    const status = req.query.status; // optional: PENDING/COMPLETED/...
    const result = await userService.listResetPasswordRequests(status);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const completeResetPassword = async (req, res, next) => {
  try {
    const result = await userService.completeResetPassword(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// --- Admin: verify/activate user ---
const verifyUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const result = await userService.verifyUserByAdmin(req.user.id, userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// 2FA
const generate2FA = async (req, res, next) => {
  try {
    const result = await userService.generate2FA(req.user.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const enable2FA = async (req, res, next) => {
  try {
    const result = await userService.enable2FA(req.user.id, req.body.token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const disable2FA = async (req, res, next) => {
  try {
    const result = await userService.disable2FA(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  create,
  login,
  logout,
  updateProfile,
  updatePassword,
  requestResetPassword,
  listResetPasswordRequests,
  completeResetPassword,
  verifyUser,
  generate2FA,
  enable2FA,
  disable2FA,
};
