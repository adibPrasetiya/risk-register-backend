import tokenUtil from '../utils/token.util.js';
import { ResponseError } from '../errors/response.error.js';
import { prismaClient } from '../app/database.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    return next(new ResponseError(401, 'Unauthorized: No token provided'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new ResponseError(401, 'Unauthorized: Invalid token format'));
  }

  const decoded = tokenUtil.verifyAccessToken(token);

  if (!decoded) {
    return next(new ResponseError(401, 'Unauthorized: Invalid or expired token'));
  }

  // Optionally check if user still exists or is active
  // This adds DB overhead but ensures better security (e.g. if user is deleted/banned)
  const user = await prismaClient.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      username: true,
      email: true,
      is_active: true,
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

  req.user = {
      ...user,
      roles: user.userRoles.map(ur => ur.role.name)
  };
  
  next();
};
