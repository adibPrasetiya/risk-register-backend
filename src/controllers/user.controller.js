import userService from '../services/user.service.js';

const create = async (req, res, next) => {
  try {
    const userAgentInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.get('X-Device-Id') || 'unknown',
      deviceName: req.get('X-Device-Name'),
    };

    const result = await userService.registration(req.body, userAgentInfo);
    
    // Set Refresh Token Cookie
    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
    const userAgentInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.get('X-Device-Id') || 'unknown',
      deviceName: req.get('X-Device-Name'),
    };

    const result = await userService.login(req.body, userAgentInfo);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
