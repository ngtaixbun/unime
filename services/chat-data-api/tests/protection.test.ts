import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { AuditLogger, redactForLog } from "../src/lib/audit-logger.js";
import { createClientRateLimitMiddleware } from "../src/middleware/rate-limit.middleware.js";
import { ProtectionError } from "../src/errors/protection.error.js";
import { SemanticExecutionGate } from "../src/services/semantic-execution-gate.js";

function invokeRateLimit(
  middleware: ReturnType<typeof createClientRateLimitMiddleware>,
  clientId: string,
) {
  const headers = new Map<string, string>();
  let statusCode: number | undefined;
  let body: unknown;
  let nextCalls = 0;
  const request = { requestId: `request-${clientId}`, clientId } as unknown as Request;
  const response = {
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
    status(status: number) { statusCode = status; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  middleware(request, response, (() => { nextCalls += 1; }) as NextFunction);
  return { headers, statusCode, body, nextCalls };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function expectProtectionError(
  promise: Promise<unknown>,
  code: ProtectionError["code"],
  statusCode: ProtectionError["statusCode"],
) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ProtectionError);
    assert.equal(error.code, code);
    assert.equal(error.statusCode, statusCode);
    return true;
  });
}

describe("client rate limiting", () => {
  it("limits each authenticated client independently and emits Retry-After", () => {
    let time = 1_000;
    const middleware = createClientRateLimitMiddleware({
      windowMs: 2_000,
      maxRequests: 2,
      now: () => time,
      resolveClientId: (request) => (request as Request & { clientId: string }).clientId,
    });

    assert.equal(invokeRateLimit(middleware, "app-a").nextCalls, 1);
    const second = invokeRateLimit(middleware, "app-a");
    assert.equal(second.nextCalls, 1);
    assert.equal(second.headers.get("ratelimit-remaining"), "0");

    const limited = invokeRateLimit(middleware, "app-a");
    assert.equal(limited.statusCode, 429);
    assert.equal(limited.headers.get("retry-after"), "2");
    assert.match(JSON.stringify(limited.body), /RATE_LIMITED/);

    assert.equal(invokeRateLimit(middleware, "app-b").nextCalls, 1);
    time = 3_000;
    assert.equal(invokeRateLimit(middleware, "app-a").nextCalls, 1);
  });
});

describe("SemanticExecutionGate", () => {
  it("enforces concurrency and starts queued work in FIFO order", async () => {
    const gate = new SemanticExecutionGate({ maxConcurrency: 1, maxQueueSize: 3, queueTimeoutMs: 1_000 });
    const first = deferred<string>();
    const started: string[] = [];
    const p1 = gate.execute(async () => { started.push("first"); return first.promise; });
    const p2 = gate.execute(async () => { started.push("second"); return "two"; });
    const p3 = gate.execute(async () => { started.push("third"); return "three"; });

    await Promise.resolve();
    assert.deepEqual(started, ["first"]);
    assert.equal(gate.active, 1);
    assert.equal(gate.queued, 2);
    first.resolve("one");
    assert.deepEqual(await Promise.all([p1, p2, p3]), ["one", "two", "three"]);
    assert.deepEqual(started, ["first", "second", "third"]);
    assert.equal(gate.active, 0);
    assert.equal(gate.queued, 0);
  });

  it("rejects queue overflow and times out queued work without starting it", async () => {
    const gate = new SemanticExecutionGate({ maxConcurrency: 1, maxQueueSize: 1, queueTimeoutMs: 10 });
    const first = deferred<void>();
    let queuedStarted = false;
    const active = gate.execute(() => first.promise);
    const queued = gate.execute(async () => { queuedStarted = true; });
    await expectProtectionError(
      gate.execute(async () => undefined),
      "SEMANTIC_BUSY",
      503,
    );
    await expectProtectionError(queued, "SEMANTIC_BUSY", 503);
    assert.equal(queuedStarted, false);
    assert.equal(gate.queued, 0);
    first.resolve();
    await active;
  });

  it("removes cancelled queued work and never starts it", async () => {
    const gate = new SemanticExecutionGate({ maxConcurrency: 1, maxQueueSize: 2, queueTimeoutMs: 1_000 });
    const first = deferred<void>();
    const active = gate.execute(() => first.promise);
    const abort = new AbortController();
    let cancelledStarted = false;
    const cancelled = gate.execute(async () => { cancelledStarted = true; }, abort.signal);
    abort.abort();
    await expectProtectionError(cancelled, "REQUEST_ABORTED", 499);
    assert.equal(gate.queued, 0);
    first.resolve();
    await active;
    assert.equal(cancelledStarted, false);
  });
});

describe("structured audit logging", () => {
  it("writes only the typed semantic event and normalizes duration", () => {
    const output: string[] = [];
    const logger = new AuditLogger((line) => output.push(line));
    logger.semanticQuery({
      event: "semantic_query",
      requestId: "request-1",
      authenticatedApplicationId: "hubi-app",
      questionId: "coverage_store",
      authorizedScope: "NATIONWIDE",
      status: 200,
      durationMs: 12.6,
      outcome: "success",
    });
    assert.equal(output.length, 1);
    assert.deepEqual(JSON.parse(output[0]!), {
      level: "info",
      event: "semantic_query",
      requestId: "request-1",
      authenticatedApplicationId: "hubi-app",
      questionId: "coverage_store",
      authorizedScope: "NATIONWIDE",
      status: 200,
      durationMs: 13,
      outcome: "success",
    });
  });

  it("recursively redacts sensitive fields", () => {
    assert.deepEqual(redactForLog({
      requestId: "safe",
      authorization: "Bearer secret",
      nested: { clientSecret: "secret", rawDax: "EVALUATE ROW()", status: 502 },
      items: [{ accessToken: "token", questionId: "coverage_store" }],
    }), {
      requestId: "safe",
      authorization: "[REDACTED]",
      nested: { clientSecret: "[REDACTED]", rawDax: "[REDACTED]", status: 502 },
      items: [{ accessToken: "[REDACTED]", questionId: "coverage_store" }],
    });
  });
});
