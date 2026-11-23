import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";
import { logError } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  const clientStatus = getClientRequestStatus(error);
  if (clientStatus) {
    return res.status(clientStatus).json({
      error: { message: clientStatus === 413 ? "Request body is too large" : "Malformed request body" },
      requestId: res.getHeader("x-request-id"),
    });
  }

  logError("request_error", error);
  return res.status(500).json({
    error: { message: "Internal server error" },
    requestId: res.getHeader("x-request-id"),
  });
};

function getClientRequestStatus(error: unknown): 400 | 413 | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = error.status;
  return status === 413 ? 413 : status === 400 ? 400 : undefined;
}
