import type { NextFunction, Request, Response } from "express";
import type { ChatDataEnv } from "../config/env.js";
import { chatQueryRequestSchema } from "../contracts/query.contract.js";
import { questionRegistry } from "../registry/question.registry.js";
import type { SemanticQueryService } from "../services/semantic-query.service.js";
import { SemanticExecutionGate } from "../services/semantic-execution-gate.js";
import { SemanticError } from "../errors/semantic.error.js";

export function createQueryController(
  env: ChatDataEnv,
  executionGate: SemanticExecutionGate,
  semanticQueryService?: SemanticQueryService,
) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const result = chatQueryRequestSchema.safeParse(request.body);
  if (!result.success) {
    const rawQuestionId = typeof request.body?.questionId === "string" ? request.body.questionId : undefined;
    response.status(400).json({
      apiVersion: "1",
      ...(rawQuestionId === undefined ? {} : { questionId: rawQuestionId }),
      requestId: request.requestId,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request does not match the supported chat query contract.",
        details: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  const body = result.data;
  const requestId = body.requestId ?? request.requestId;
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  const question = questionRegistry[body.questionId];
  request.auditQuestionId = question.questionId;

  if (!request.auth?.permissions.has(question.requiredPermission)) {
    request.safeErrorCategory = "FORBIDDEN";
    response.status(403).json({
      apiVersion: "1",
      questionId: question.questionId,
      requestId,
      error: { code: "FORBIDDEN", message: "The application is not authorized for this question." },
    });
    return;
  }
  request.authorizedScope = question.scope;

  if (!env.CHAT_SEMANTIC_ENABLED || !semanticQueryService) {
    response.status(501).json({
      apiVersion: "1",
      questionId: question.questionId,
      requestId,
      error: {
        code: "SEMANTIC_NOT_CONFIGURED",
        message: "Power BI integration is not configured yet.",
      },
    });
    return;
  }

  const abort = new AbortController();
  let requestTimedOut = false;
  const requestTimer = setTimeout(() => {
    requestTimedOut = true;
    abort.abort();
  }, env.CHAT_REQUEST_TIMEOUT_MS);
  const onAborted = () => abort.abort();
  const onClosed = () => {
    if (!response.writableEnded) abort.abort();
  };
  request.once("aborted", onAborted);
  response.once("close", onClosed);
  try {
    const data = await executionGate.execute(
      () => semanticQueryService.executeCoverage(body.questionId, body.parameters.cycleKey, abort.signal),
      abort.signal,
    );
    if (request.aborted || response.destroyed) return;
    const responseBody = {
      apiVersion: "1",
      questionId: question.questionId,
      requestId,
      data,
      meta: { scope: question.scope, cycleKey: body.parameters.cycleKey },
    } as const;
    if (Buffer.byteLength(JSON.stringify(responseBody), "utf8") > env.CHAT_MAX_RESPONSE_BYTES) {
      request.safeErrorCategory = "RESPONSE_TOO_LARGE";
      response.status(500).json({
        apiVersion: "1",
        questionId: question.questionId,
        requestId,
        error: { code: "RESPONSE_TOO_LARGE", message: "The response exceeds the allowed size." },
      });
      return;
    }
    response.status(200).json(responseBody);
  } catch (error) {
    if (!request.aborted && !response.destroyed) {
      next(requestTimedOut
        ? new SemanticError("SEMANTIC_TIMEOUT", "The semantic query timed out.", 504)
        : error);
    }
  } finally {
    clearTimeout(requestTimer);
    request.off("aborted", onAborted);
    response.off("close", onClosed);
  }
  };
}
