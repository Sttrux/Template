import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";
import { matchesCsrfToken } from "../utils/csrf.js";

export const requireCsrfToken: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (matchesCsrfToken(req.session.csrfToken, req.get("x-csrf-token"))) {
    return next();
  }
  return next(new AppError(403, "CSRF token is missing or invalid"));
};
