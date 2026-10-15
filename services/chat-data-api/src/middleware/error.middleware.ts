import type { ErrorRequestHandler } from "express";
import { SemanticError } from "../errors/semantic.error.js";
import { ProtectionError } from "../errors/protection.error.js";

export const errorMiddleware: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ProtectionError) {
    request.safeErrorCategory = error.code;
    if (error.retryAfterSeconds !== undefined) response.setHeader("retry-after", String(error.retryAfterSeconds));
    response.status(error.statusCode).json({
      apiVersion: "1",
      requestId: request.requestId,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  if (error instanceof SemanticError) {
    request.safeErrorCategory = error.code;
    response.status(error.statusCode).json({
      apiVersion: "1",
      requestId: request.requestId,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  const isJsonSyntaxError = error instanceof SyntaxError && "body" in error;
  const isBodyTooLarge = typeof error === "object" && error !== null && "status" in error && error.status === 413;
  request.safeErrorCategory = isBodyTooLarge ? "PAYLOAD_TOO_LARGE" : isJsonSyntaxError ? "INVALID_JSON" : "INTERNAL_ERROR";
  response.status(isBodyTooLarge ? 413 : isJsonSyntaxError ? 400 : 500).json({
    apiVersion: "1",
    requestId: request.requestId,
    error: {
      code: isBodyTooLarge ? "PAYLOAD_TOO_LARGE" : isJsonSyntaxError ? "INVALID_JSON" : "INTERNAL_ERROR",
      message: isBodyTooLarge
        ? "Request body exceeds the allowed size."
        : isJsonSyntaxError
          ? "Request body must contain valid JSON."
          : "An unexpected error occurred.",
    },
  });
};
