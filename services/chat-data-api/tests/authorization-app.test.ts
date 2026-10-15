import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { describe, it } from "node:test";
import { createApp } from "../src/app.js";
import { getEnv } from "../src/config/env.js";
import type { ApplicationTokenVerifier, AuthenticatedApplication } from "../src/auth/types.js";
import type { SemanticQueryService } from "../src/services/semantic-query.service.js";
import { AuditLogger } from "../src/lib/audit-logger.js";

const id = "11111111-1111-4111-8111-111111111111";
const productionEnv = getEnv({
  NODE_ENV: "production", CHAT_SEMANTIC_ENABLED: "true", CHAT_REQUIRE_HTTPS: "true", CHAT_TRUST_PROXY_HOPS: "1",
  CHAT_ENTRA_TENANT_ID: id, CHAT_ENTRA_API_AUDIENCE: "api://chat-data", CHAT_ENTRA_ALLOWED_CLIENT_IDS: id,
  CHAT_POWERBI_TENANT_ID: id, CHAT_POWERBI_CLIENT_ID: id, CHAT_POWERBI_CLIENT_SECRET: "test-only",
  CHAT_POWERBI_WORKSPACE_ID: id, CHAT_POWERBI_SEMANTIC_MODEL_ID: id,
  CHAT_RATE_LIMIT_WINDOW_MS: "60000", CHAT_RATE_LIMIT_MAX_REQUESTS: "10",
  CHAT_SEMANTIC_MAX_CONCURRENCY: "1", CHAT_SEMANTIC_MAX_QUEUE: "1",
  CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: "1000", CHAT_REQUEST_TIMEOUT_MS: "5000", CHAT_MAX_RESPONSE_BYTES: "16384",
});

async function withServer(
  principal: AuthenticatedApplication,
  run: (baseUrl: string, logs: string[]) => Promise<void>,
) {
  const verifier: ApplicationTokenVerifier = { async verify() { return principal; } };
  const service: SemanticQueryService = { async executeCoverage() { return { actual: 8, plan: 10, coveragePercent: 80 }; } };
  const logs: string[] = [];
  const server: Server = createApp(productionEnv, {
    tokenVerifier: verifier,
    semanticQueryService: service,
    auditLogger: new AuditLogger((line) => logs.push(line)),
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, logs); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

function post(baseUrl: string, questionId: "coverage_store" | "coverage_employee", token = "sensitive-token") {
  return fetch(`${baseUrl}/api/chat/v1/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-forwarded-proto": "https" },
    body: JSON.stringify({ apiVersion: "1", questionId, requestId: `authz-${questionId}`, parameters: { cycleKey: "202610", region: "ALL" } }),
  });
}

describe("trusted application authorization", () => {
  it("allows only the question permission granted to the verified application", async () => {
    await withServer({
      authenticationMode: "entra", applicationId: id,
      permissions: new Set(["coverage_store:nationwide:read"]),
    }, async (baseUrl) => {
      assert.equal((await post(baseUrl, "coverage_store")).status, 200);
      const denied = await post(baseUrl, "coverage_employee");
      assert.equal(denied.status, 403);
      assert.equal((await denied.json() as { error: { code: string } }).error.code, "FORBIDDEN");
    });
  });

  it("rejects HTTP before authentication in production", async () => {
    await withServer({ authenticationMode: "entra", applicationId: id, permissions: new Set() }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/chat/v1/query`, { method: "POST" });
      assert.equal(response.status, 400);
      assert.match(await response.text(), /HTTPS_REQUIRED/);
      const health = await fetch(`${baseUrl}/api/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(Object.keys(await health.json() as object).sort(), ["requestId", "service", "status"]);
      assert.equal((await fetch(`${baseUrl}/api/health`, { method: "POST" })).status, 400);
    });
  });

  it("writes one allowlisted audit event without token, body, DAX, or semantic values", async () => {
    await withServer({
      authenticationMode: "entra", applicationId: id,
      permissions: new Set(["coverage_store:nationwide:read"]),
    }, async (baseUrl, logs) => {
      assert.equal((await post(baseUrl, "coverage_store", "never-log-this-token")).status, 200);
      assert.equal(logs.length, 1);
      const log = logs[0]!;
      assert.match(log, /"event":"semantic_query"/);
      assert.match(log, new RegExp(id));
      assert.doesNotMatch(log, /never-log-this-token|actual|plan|coveragePercent|dax/i);
    });
  });
});
