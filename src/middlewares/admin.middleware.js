import { ResponseError } from "../errors/response.error.js";

export const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles.includes("ADMINISTRATOR")) {
    return next(new ResponseError(403, "Forbidden: Admin access required"));
  }
  next();
};
