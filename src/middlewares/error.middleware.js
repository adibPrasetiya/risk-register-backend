import { ResponseError } from "../errors/response.error.js";
import { ValidationError } from "../errors/validation.error.js";

export const errorMiddleware = (err, _req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      errors: err.details.map((d) => d.detail).join(", "),
      details: err.details,
    });
  } else if (err instanceof ResponseError) {
    res.status(err.statusCode).json({
      errors: err.message,
    });
  } else {
    console.error(err);
    res.status(500).json({
      errors: "Internal Server Error",
    });
  }
};
