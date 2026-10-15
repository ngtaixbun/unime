import express, { type Request, type Response } from "express";
import helmet from "helmet";
import type { ChatDataEnv } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { createHealthRouter } from "./routes/health.route.js";
import { createQueryRouter } from "./routes/query.route.js";
import type { SemanticQueryService } from "./services/semantic-query.service.js";
import { SemanticExecutionGate } from "./services/semantic-execution-gate.js";
import type { ApplicationTokenVerifier } from "./auth/types.js";
import { AuditLogger } from "./lib/audit-logger.js";

export interface AppDependencies {
  readonly semanticQueryService?: SemanticQueryService;
  readonly tokenVerifier?: ApplicationTokenVerifier;
  readonly executionGate?: SemanticExecutionGate;
  readonly auditLogger?: AuditLogger;
}

export function createApp(env: ChatDataEnv, dependencies: AppDependencies = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (env.CHAT_TRUST_PROXY_HOPS > 0) app.set("trust proxy", env.CHAT_TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(requestIdMiddleware);
  const auditLogger = dependencies.auditLogger ?? new AuditLogger();
  app.use((request: Request, response: Response, next) => {
    response.setHeader("cache-control", "no-store, private");
    response.on("finish", () => {
      if (request.originalUrl.split("?", 1)[0] === "/api/chat/v1/query") {
        const status = response.statusCode;
        auditLogger.semanticQuery({
          event: "semantic_query",
          requestId: request.requestId,
          ...(request.auth ? { authenticatedApplicationId: request.auth.applicationId } : {}),
          ...(request.auditQuestionId ? { questionId: request.auditQuestionId } : {}),
          ...(request.authorizedScope ? { authorizedScope: request.authorizedScope } : {}),
          status,
          durationMs: performance.now() - request.requestStartedAt,
          outcome: status < 400 ? "success" : status === 401 || status === 403 ? "denied" : status === 429 ? "rate_limited" : status === 503 ? "busy" : status === 499 ? "cancelled" : "error",
          ...(request.safeErrorCategory ? { errorCategory: request.safeErrorCategory } : {}),
        });
      }
    });
    next();
  });
  app.use((request: Request, response: Response, next) => {
    // The hosting platform's health probe reaches the instance over internal
    // HTTP. The health route returns no data, so only it is exempt.
    const isHealthProbe = request.method === "GET" && request.path === "/api/health";
    if (env.CHAT_REQUIRE_HTTPS && !request.secure && !isHealthProbe) {
      request.safeErrorCategory = "HTTPS_REQUIRED";
      response.status(400).json({ apiVersion: "1", requestId: request.requestId, error: { code: "HTTPS_REQUIRED", message: "HTTPS is required." } });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use("/api/health", createHealthRouter());
  const executionGate = dependencies.executionGate ?? new SemanticExecutionGate({
    maxConcurrency: env.CHAT_SEMANTIC_MAX_CONCURRENCY,
    maxQueueSize: env.CHAT_SEMANTIC_MAX_QUEUE,
    queueTimeoutMs: env.CHAT_SEMANTIC_QUEUE_TIMEOUT_MS,
  });
  app.use("/api/chat/v1", createQueryRouter(env, {
    executionGate,
    ...(dependencies.semanticQueryService ? { semanticQueryService: dependencies.semanticQueryService } : {}),
    ...(dependencies.tokenVerifier ? { tokenVerifier: dependencies.tokenVerifier } : {}),
  }));
  app.use((request: Request, response: Response) => {
    response.status(404).json({
      apiVersion: "1",
      requestId: request.requestId,
      error: { code: "ROUTE_NOT_FOUND", message: `Route ${request.method} ${request.path} was not found.` },
    });
  });
  app.use(errorMiddleware);
  return app;
}
