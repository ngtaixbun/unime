import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const safeRequestId = /^[A-Za-z0-9._:-]{1,128}$/u;

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
    requestStartedAt: number;
  }
}

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const supplied = request.header("x-request-id");
  request.requestId = supplied && safeRequestId.test(supplied) ? supplied : randomUUID();
  request.requestStartedAt = performance.now();
  response.setHeader("x-request-id", request.requestId);
  next();
}
