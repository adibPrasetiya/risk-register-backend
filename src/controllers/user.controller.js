import userService from '../services/user.service.js';
import { IS_PRODUCTION, REFRESH_TOKEN_COOKIE_MAX_AGE } from '../config/constant.js';

const create = async (req, res, next) => {
  try {
    const result = await userService.registration(req.body, req);
    
    // Set Refresh Token Cookie
    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.status(201).json({
      message: result.message,
      data: result.data, // Contains user and accessToken
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body, req);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.status(200).json({
      data: {
        accessToken: result.accessToken,
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
    
    res.clearCookie('refreshToken');
    res.status(200).json({
      data: 'OK'
    });
  } catch (error) {
    next(error);
  }
};

export default { create, login, logout };