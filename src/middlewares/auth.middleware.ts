import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findAuthUserById } from "../repository/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { requireCsrfToken } from "./csrf.middleware.js";

export const authenticateJWT: RequestHandler = async (req, _res, next) => {
  const authorization = req.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return next(new AppError(401, "Bearer token is required"));

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "template-api",
      audience: "template-api",
    });
  } catch {
    return next(new AppError(401, "Bearer token is invalid or expired"));
  }

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    return next(new AppError(401, "Bearer token payload is invalid"));
  }

  const userId = Number(decoded.sub);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return next(new AppError(401, "Bearer token subject is invalid"));
  }

  const user = await findAuthUserById(userId);
  if (!user) return next(new AppError(401, "Bearer token user no longer exists"));

  req.user = user;
  return next();
};

export const authenticateSession: RequestHandler = (req, _res, next) => {
  if (!req.isAuthenticated()) return next(new AppError(401, "Login required"));
  next();
};

export const authenticateEither: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  if (authorization) {
    if (!/^Bearer\s+/i.test(authorization)) {
      return next(new AppError(401, "Unsupported authorization scheme"));
    }
    return authenticateJWT(req, res, next);
  }
  return authenticateSession(req, res, (error?: unknown) => {
    if (error) return next(error);
    return requireCsrfToken(req, res, next);
  });
};

export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, "Login required"));
    if (!req.user.permissions.includes(permission)) {
      return next(new AppError(403, "Insufficient permission"));
    }
    return next();
  };
}

export function requireAnyPermission(...permissions: string[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(new AppError(401, "Login required"));
    if (!permissions.some((permission) => user.permissions.includes(permission))) {
      return next(new AppError(403, "Insufficient permission"));
    }
    return next();
  };
}
