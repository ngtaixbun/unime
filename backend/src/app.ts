import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import type { GatewayEnv } from "./config/env.js";
import type { DaxController } from "./controllers/dax.controller.js";
import type { HealthController } from "./controllers/health.controller.js";
import { CorsOriginError, errorMiddleware } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { createDaxRouter } from "./routes/dax.route.js";
import { createHealthRouter } from "./routes/health.route.js";

export interface AppControllers {
  readonly dax: DaxController;
  readonly health: HealthController;
}

export function createApp(env: GatewayEnv, controllers: AppControllers) {
  const app = express();
  const allowedOrigins = new Set(env.corsOrigins);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new CorsOriginError());
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    credentials: false,
  }));
  app.use(express.json({
    limit: env.DAX_MAX_LENGTH_BYTES * env.BATCH_MAX_QUERIES + 65_536,
  }));
  app.use((request: Request, response: Response, next) => {
    response.on("finish", () => {
      console.info(JSON.stringify({
        level: "info",
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl.split("?", 1)[0],
        status: response.statusCode,
        durationMs: Math.max(0, Math.round(performance.now() - request.requestStartedAt)),
      }));
    });
    next();
  });
  app.use("/api/dax", (_request, response, next) => {
    response.setHeader("cache-control", "no-store, private");
    next();
  });
  app.use("/api/health", createHealthRouter(controllers.health));
  app.use("/api/dax", createDaxRouter(controllers.dax));
  app.use((request: Request, response: Response) => {
    response.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${request.method} ${request.path} was not found.`,
        requestId: request.requestId,
      },
    });
  });
  app.use(errorMiddleware);
  return app;
}