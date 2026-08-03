import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { GatewayError } from "../types/dax.js";

export class CorsOriginError extends GatewayError {
  public constructor() {
    super("CORS_ORIGIN_DENIED", "The request origin is not allowed.", 403);
  }
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError &&
    typeof error === "object" && error !== null &&
    "status" in error && (error as { status?: unknown }).status === 400;
}

export function errorMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  void _next;
  let mapped: GatewayError;
  if (error instanceof ZodError || isJsonSyntaxError(error)) {
    mapped = new GatewayError("INVALID_REQUEST", "The request payload is invalid.", 400);
  } else if (error instanceof GatewayError) {
    mapped = error;
  } else {
    mapped = new GatewayError("INTERNAL_SERVER_ERROR", "The gateway could not process the request.", 500);
  }

  if (mapped.statusCode >= 500) {
    console.error(JSON.stringify({
      level: "error",
      requestId: request.requestId,
      code: mapped.code,
      status: mapped.statusCode,
    }));
  }

  response.status(mapped.statusCode === 499 ? 400 : mapped.statusCode).json({
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      requestId: request.requestId,
      ...(mapped.failedQueryName ? { failedQueryName: mapped.failedQueryName } : {}),
      ...(mapped.details ? { details: mapped.details } : {}),
    },
  });
}
