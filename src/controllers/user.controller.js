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

export default { create, login, logout };
