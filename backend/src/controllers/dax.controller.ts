import type { NextFunction, Request, Response } from "express";
import type { GatewayEnv } from "../config/env.js";
import type { DaxQueryExecutor } from "../types/dax.js";
import type { ResponseTransformer } from "../services/response-transformer.service.js";
import { createDaxRequestSchemas } from "../validation/dax-request.schema.js";

export interface DaxController {
  executeQuery: (request: Request, response: Response, next: NextFunction) => void;
  executeBatch: (request: Request, response: Response, next: NextFunction) => void;
}

function requestAbortSignal(request: Request): AbortSignal {
  const controller = new AbortController();
  request.once("aborted", () => controller.abort());
  return controller.signal;
}

export function createDaxController(
  env: GatewayEnv,
  executor: DaxQueryExecutor,
  transformer: ResponseTransformer,
): DaxController {
  const schemas = createDaxRequestSchemas(env);

  const executeQuery = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = schemas.single.parse(request.body);
      const result = await executor.executeQuery(input, requestAbortSignal(request));
      response.json({
        success: true,
        data: transformer.transformSingle(result),
        meta: {
          requestId: request.requestId,
          durationMs: Math.max(0, Math.round(performance.now() - request.requestStartedAt)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  const executeBatch = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = schemas.batch.parse(request.body);
      const result = await executor.executeBatch(input.queries, requestAbortSignal(request));
      response.json({ success: true, data: transformer.transformBatch(result) });
    } catch (error) {
      next(error);
    }
  };

  return { executeQuery, executeBatch };
}
