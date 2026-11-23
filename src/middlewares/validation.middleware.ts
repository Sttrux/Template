import { validationResult } from "express-validator";
import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const validateRequest: RequestHandler = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  next(
    new AppError(
      400,
      "Request validation failed",
      errors.array().map((error) => ({
        field: "path" in error ? error.path : "",
        message: error.msg,
      })),
    ),
  );
};
