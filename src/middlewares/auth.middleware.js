import { ResponseError } from "../errors/response.error.js";
import { prismaClient } from "../app/database.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new ResponseError(
          401,
          "Unauthorized: No token provided or invalid format"
        )
      );
    }

    const token = authHeader.split(" ")[1];

    // Opaque Token Validation: Check DB
    const session = await prismaClient.session.findUnique({
      where: { accessToken: token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session || !session.user) {
      return next(
        new ResponseError(401, "Unauthorized: Invalid or expired access token")
      );
    }

    // Check Expiry
    if (session.accessTokenExpiresAt && new Date() > session.accessTokenExpiresAt) {
       return next(
        new ResponseError(401, "Unauthorized: Access token expired")
      );
    }

    const user = session.user;

    if (!user.is_active) {
      return next(new ResponseError(403, "Forbidden: User is not active"));
    }

    if (!user.is_verified) {
      return next(new ResponseError(403, "Forbidden: User is not verified"));
    }

    if (user.password_changed_at) {
      // For opaque tokens, we can check session creation time or just assume if session exists it's valid
      // But strictly, if password changed after session creation, we should invalidate.
      // session.updatedAt covers the last login/refresh.
      const sessionTime = Math.floor(session.updatedAt.getTime() / 1000);
      const passwordChangedTime = Math.floor(
        user.password_changed_at.getTime() / 1000
      );
      
      if (sessionTime < passwordChangedTime) {
         return next(
          new ResponseError(
            401,
            "Unauthorized: Password recently changed. Please login again."
          )
        );
      }
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    };

    next();
  } catch (error) {
    next(error);
  }
};
