import userService from "../services/user.service.js";
import { NODE_ENV } from "../config/constant.js";
import deviceUtil from "../utils/device.util.js";

const create = async (req, res, next) => {
  try {
    const result = await userService.registration(req.body);

    res.status(201).json({
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const userAgent = req.headers["user-agent"] || "unkonwn";
    const ipAddress = deviceUtil.extractIpAddress(req);

    const result = await userService.login(req.body, userAgent, ipAddress);

    res
      .cookie("refreshToken", result.data.refreshToken, {
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: "strict",
        maxAge:
          NODE_ENV === "production"
            ? 1 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: result.message,
        data: {
          user: result.data.user,
          accessToken: result.data.accessToken,
        },
      });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware, use id from it
    await userService.logout(req.user.id);

    res.clearCookie("refreshToken");
    res.status(200).json({
      data: "OK",
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await userService.changePassword(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const generate2FA = async (req, res, next) => {
  try {
    const result = await userService.generate2FA(req.user.id);
    res.status(200).json({
      data: result,
    });
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

const adminResetPassword = async (req, res, next) => {
  try {
    // Check if requester is admin (should be done in middleware usually, but checking roles here just in case or relying on route middleware)
    // Assuming route middleware handles role check.
    const result = await userService.adminResetPassword(req.body.identifier);
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
  changePassword,
  generate2FA,
  enable2FA,
  disable2FA,
  adminResetPassword
};
