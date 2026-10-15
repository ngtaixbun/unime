import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { requestIdSchema } from "../contracts/query.contract.js";

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const supplied = request.header("x-request-id");
  const parsed = supplied === undefined ? undefined : requestIdSchema.safeParse(supplied);
  request.requestId = parsed?.success ? parsed.data : randomUUID();
  request.requestStartedAt = performance.now();
  response.setHeader("x-request-id", request.requestId);
  next();
}
