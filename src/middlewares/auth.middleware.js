import tokenUtil from '../utils/token.util.js';
import { ResponseError } from '../errors/response.error.js';
import { prismaClient } from '../app/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ResponseError(401, 'Unauthorized: No token provided or invalid format'));
    }

    const token = authHeader.split(' ')[1];

    const decoded = tokenUtil.verifyAccessToken(token);

    if (!decoded) {
      return next(new ResponseError(401, 'Unauthorized: Invalid or expired token'));
    }

    // Optionally check if user still exists or is active
    // This adds DB overhead but ensures better security (e.g. if user is deleted/banned)
    const user = await prismaClient.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        password_changed_at: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return next(new ResponseError(401, 'Unauthorized: User not found'));
    }

    if (!user.is_active) {
      return next(new ResponseError(403, 'Forbidden: User is not active'));
    }

    // Check if token was issued before password change
    if (user.password_changed_at) {
      const passwordChangedTime = Math.floor(user.password_changed_at.getTime() / 1000);
      if (decoded.iat < passwordChangedTime) {
        return next(new ResponseError(401, 'Unauthorized: Password recently changed. Please login again.'));
      }
    }

    req.user = {
        ...user,
        roles: user.userRoles.map(ur => ur.role.name)
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
