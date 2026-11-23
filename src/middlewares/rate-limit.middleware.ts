import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const commonOptions = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests; try again later" } },
};

export const apiRateLimiter = rateLimit({
  ...commonOptions,
  limit: env.RATE_LIMIT_MAX,
  skip: (req) => req.path === "/" || req.path === "/health",
});

export const authRateLimiter = rateLimit({
  ...commonOptions,
  limit: env.AUTH_RATE_LIMIT_MAX,
});
