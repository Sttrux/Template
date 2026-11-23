import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logInfo } from "../utils/logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = performance.now();

  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    logInfo("http_request", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  next();
};
