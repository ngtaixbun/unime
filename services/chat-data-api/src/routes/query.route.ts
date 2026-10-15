import { Router } from "express";
import type { ChatDataEnv } from "../config/env.js";
import { createQueryController } from "../controllers/query.controller.js";
import { createLocalAuthMiddleware } from "../middleware/auth.middleware.js";
import { createClientRateLimitMiddleware } from "../middleware/rate-limit.middleware.js";
import type { SemanticQueryService } from "../services/semantic-query.service.js";
import { SemanticExecutionGate } from "../services/semantic-execution-gate.js";
import type { ApplicationTokenVerifier } from "../auth/types.js";

export interface QueryRouterDependencies {
  readonly semanticQueryService?: SemanticQueryService;
  readonly tokenVerifier?: ApplicationTokenVerifier;
  readonly executionGate: SemanticExecutionGate;
}

export function createQueryRouter(env: ChatDataEnv, dependencies: QueryRouterDependencies): Router {
  const router = Router();
  router.post(
    "/query",
    createLocalAuthMiddleware(env, dependencies.tokenVerifier),
    createClientRateLimitMiddleware({
      windowMs: env.CHAT_RATE_LIMIT_WINDOW_MS,
      maxRequests: env.CHAT_RATE_LIMIT_MAX_REQUESTS,
      maxTrackedClients: env.CHAT_RATE_LIMIT_MAX_CLIENTS,
      resolveClientId: (request) => request.auth?.applicationId ?? "",
    }),
    createQueryController(env, dependencies.executionGate, dependencies.semanticQueryService),
  );
  return router;
}
