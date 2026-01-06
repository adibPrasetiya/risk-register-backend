import userService from '../services/user.service.js';

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

export default { create };
