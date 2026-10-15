import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { createApp } from "../src/app.js";
import { getEnv } from "../src/config/env.js";
import { SemanticError } from "../src/errors/semantic.error.js";
import type { SemanticQueryService } from "../src/services/semantic-query.service.js";

const credential = randomBytes(32).toString("hex");
const id = "11111111-1111-4111-8111-111111111111";
const enabledEnv = getEnv({
  NODE_ENV: "test",
  CHAT_DATA_API_TEST_CREDENTIAL: credential,
  CHAT_SEMANTIC_ENABLED: "true",
  CHAT_POWERBI_TENANT_ID: id,
  CHAT_POWERBI_CLIENT_ID: id,
  CHAT_POWERBI_CLIENT_SECRET: "not-a-real-secret",
  CHAT_POWERBI_WORKSPACE_ID: id,
  CHAT_POWERBI_SEMANTIC_MODEL_ID: id,
});

async function withServer(service: SemanticQueryService, run: (baseUrl: string) => Promise<void>) {
  const server: Server = createApp(enabledEnv, { semanticQueryService: service }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function request(baseUrl: string, body: Record<string, unknown>, authorization = `Bearer ${credential}`) {
  return fetch(`${baseUrl}/api/chat/v1/query`, {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  apiVersion: "1",
  questionId: "coverage_store",
  requestId: "step02-test-001",
  parameters: { cycleKey: "202610", region: "ALL" },
};

const employeeBody = {
  ...validBody,
  questionId: "coverage_employee",
  requestId: "step04a1-employee-001",
};

describe("STEP 02 HTTP integration", () => {
  it("returns live-shaped Coverage data and fixed Nationwide metadata", async () => {
    let receivedCycle = "";
    let receivedQuestion = "";
    const service: SemanticQueryService = {
      async executeCoverage(questionId, cycleKey) {
        receivedQuestion = questionId;
        receivedCycle = cycleKey;
        return { actual: 0, plan: 0, coveragePercent: 0 };
      },
    };
    await withServer(service, async (baseUrl) => {
      const response = await request(baseUrl, validBody);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-request-id"), "step02-test-001");
      assert.deepEqual(await response.json(), {
        apiVersion: "1",
        questionId: "coverage_store",
        requestId: "step02-test-001",
        data: { actual: 0, plan: 0, coveragePercent: 0 },
        meta: { scope: "NATIONWIDE", cycleKey: "202610" },
      });
      assert.equal(receivedCycle, "202610");
      assert.equal(receivedQuestion, "coverage_store");
    });
  });

  it("returns the same response contract for coverage_employee and preserves requestId", async () => {
    const service: SemanticQueryService = {
      async executeCoverage(questionId, cycleKey) {
        assert.equal(questionId, "coverage_employee");
        assert.equal(cycleKey, "202610");
        return { actual: 0, plan: 0, coveragePercent: 0 };
      },
    };
    await withServer(service, async (baseUrl) => {
      const response = await request(baseUrl, employeeBody);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-request-id"), "step04a1-employee-001");
      assert.deepEqual(await response.json(), {
        apiVersion: "1",
        questionId: "coverage_employee",
        requestId: "step04a1-employee-001",
        data: { actual: 0, plan: 0, coveragePercent: 0 },
        meta: { scope: "NATIONWIDE", cycleKey: "202610" },
      });
    });
  });

  it("authenticates and validates before semantic execution", async () => {
    let calls = 0;
    const service: SemanticQueryService = {
      async executeCoverage() {
        calls += 1;
        return { actual: 1, plan: 1, coveragePercent: 100 };
      },
    };
    await withServer(service, async (baseUrl) => {
      assert.equal((await request(baseUrl, validBody, "")).status, 401);
      assert.equal((await request(baseUrl, { ...validBody, dax: "EVALUATE ROW(\"x\", 1)" })).status, 400);
      assert.equal((await request(baseUrl, { ...validBody, workspaceId: id })).status, 400);
      assert.equal(calls, 0);
    });
  });

  it("maps safe semantic no-data, authorization, timeout, and schema errors", async () => {
    for (const [code, status] of [
      ["SEMANTIC_NO_DATA", 404],
      ["SEMANTIC_AUTH_FAILED", 502],
      ["SEMANTIC_TIMEOUT", 504],
      ["SEMANTIC_SCHEMA_MISMATCH", 502],
    ] as const) {
      const service: SemanticQueryService = {
        async executeCoverage() {
          throw new SemanticError(code, "Safe semantic error.", status);
        },
      };
      await withServer(service, async (baseUrl) => {
        const response = await request(baseUrl, validBody);
        assert.equal(response.status, status);
        const body = await response.json() as { error: { code: string; message: string } };
        assert.deepEqual(body.error, { code, message: "Safe semantic error." });
      });
    }
  });
});
