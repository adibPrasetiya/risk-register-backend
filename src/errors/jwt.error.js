import { ResponseError } from "./response.error.js";

export class JwtError extends ResponseError {
  constructor(statusCode, message) {
    super(statusCode, message);
    this.name = "JwtError";
  }
}
