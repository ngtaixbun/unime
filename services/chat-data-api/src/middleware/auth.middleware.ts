import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { ChatDataEnv } from "../config/env.js";
import { createEntraApplicationTokenVerifier } from "../auth/entra-token-verifier.js";
import { allApplicationPermissions } from "../auth/permissions.js";
import type { ApplicationTokenVerifier } from "../auth/types.js";

function equalCredential(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function createAuthenticationMiddleware(env: ChatDataEnv, suppliedVerifier?: ApplicationTokenVerifier) {
  const verifier = env.NODE_ENV === "production"
    ? suppliedVerifier ?? createEntraApplicationTokenVerifier(env)
    : undefined;

  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const expected = env.NODE_ENV === "production" ? undefined : env.CHAT_DATA_API_TEST_CREDENTIAL;
    const authorization = request.header("authorization");
    const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

    if (env.NODE_ENV === "production") {
      if (!supplied || !verifier) {
        unauthorized(request, response);
        return;
      }
      try {
        request.auth = await verifier.verify(supplied);
        next();
      } catch {
        unauthorized(request, response);
      }
      return;
    }

    if (!expected) {
      request.safeErrorCategory = "AUTH_NOT_CONFIGURED";
      response.status(503).json({
        apiVersion: "1",
        requestId: request.requestId,
        error: { code: "AUTH_NOT_CONFIGURED", message: "Local API authentication is not configured." },
      });
      return;
    }

    if (!supplied || !equalCredential(supplied, expected)) {
      unauthorized(request, response);
      return;
    }
    request.auth = {
      authenticationMode: "local",
      applicationId: "local-development-client",
      permissions: new Set(allApplicationPermissions),
    };
    next();
  };
}

function unauthorized(request: Request, response: Response): void {
  request.safeErrorCategory = "UNAUTHORIZED";
  response.setHeader("www-authenticate", "Bearer");
  response.status(401).json({
    apiVersion: "1",
    requestId: request.requestId,
    error: { code: "UNAUTHORIZED", message: "A valid application credential is required." },
  });
}

/** @deprecated Use createAuthenticationMiddleware. Kept while routes migrate without breaking local E2E. */
export const createLocalAuthMiddleware = createAuthenticationMiddleware;
