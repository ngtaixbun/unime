import cors from "cors";

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import rateLimit from
  "express-rate-limit";

import helmet from "helmet";
import { ZodError } from "zod";

import { env } from "./config/env.js";

import {
  daxRouter,
} from "./routes/dax.route.js";

import {
  executePowerBiDax,
  PowerBiServiceError,
} from "./services/powerbi-query.js";

class CorsOriginError extends Error {
  public constructor(
    origin: string,
  ) {
    super(
      `Origin không được phép: ${origin}`,
    );

    this.name = "CorsOriginError";
  }
}

export const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        env.corsOrigins.includes(
          origin,
        )
      ) {
        callback(null, true);
        return;
      }

      callback(
        new CorsOriginError(
          origin,
        ),
      );
    },

    methods: [
      "GET",
      "POST",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

app.use(
  express.json({
    limit: "32kb",
  }),
);

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get(
  "/api/health",
  (
    _request: Request,
    response: Response,
  ) => {
    response.json({
      success: true,

      data: {
        service:
          "unime-backend",

        status:
          "healthy",
      },
    });
  },
);

app.get(
  "/api/health/semantic-model",
  async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const result =
        await executePowerBiDax(
          `
EVALUATE
ROW(
    "status",
    1
)
          `.trim(),
        );

      response.json({
        success: true,

        data: {
          semanticModel:
            "connected",

          queryResult:
            result,
        },
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

app.use(
  "/api/dax",
  daxRouter,
);

app.use(
  (
    request: Request,
    response: Response,
  ) => {
    response.status(404).json({
      success: false,

      error: {
        code:
          "ROUTE_NOT_FOUND",

        message:
          `Không tìm thấy ${request.method} ${request.path}.`,
      },
    });
  },
);

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (
      error instanceof
      ZodError
    ) {
      response.status(400).json({
        success: false,

        error: {
          code:
            "INVALID_REQUEST",

          message:
            "Query ID hoặc filter không hợp lệ.",

          details:
            error.flatten(),
        },
      });

      return;
    }

    if (
      error instanceof
      CorsOriginError
    ) {
      response.status(403).json({
        success: false,

        error: {
          code:
            "CORS_ORIGIN_DENIED",

          message:
            error.message,
        },
      });

      return;
    }

    if (
      error instanceof
      PowerBiServiceError
    ) {
      console.error({
        code: error.code,
        message: error.message,
        cause: error.cause,
      });

      response
        .status(
          error.statusCode,
        )
        .json({
          success: false,

          error: {
            code:
              error.code,

            message:
              error.message,
          },
        });

      return;
    }

    console.error(error);

    response.status(500).json({
      success: false,

      error: {
        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "Backend không thể xử lý request.",
      },
    });
  },
);