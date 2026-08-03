import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createApp } from "../../src/app.js";
import { createDaxController } from "../../src/controllers/dax.controller.js";
import { createHealthController } from "../../src/controllers/health.controller.js";
import { DaxResponseTransformer } from "../../src/services/response-transformer.service.js";
import { GatewayError } from "../../src/types/dax.js";
import { StubExecutor, testEnv } from "../helpers.js";

async function withServer(
  executor: StubExecutor,
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const env = testEnv();
  const app = createApp(env, {
    dax: createDaxController(env, executor, new DaxResponseTransformer()),
    health: createHealthController(executor),
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health routes expose exact process and real semantic contracts", async () => {
  const executor = new StubExecutor();
  executor.singleResult = { columns: ["gatewayOk"], rows: [{ gatewayOk: 1 }] };
  await withServer(executor, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      success: true,
      service: "unime-generic-dax-gateway",
      status: "ok",
    });
    const semantic = await fetch(`${baseUrl}/api/health/semantic-model`);
    assert.equal(semantic.status, 200);
    assert.deepEqual(executor.singleInputs.at(-1), {
      dax: 'EVALUATE ROW("gatewayOk", 1)', expectedColumns: ["gatewayOk"],
    });
  });
});

test("single query returns object rows, columns, rowCount, request ID and duration", async () => {
  const executor = new StubExecutor();
  executor.singleResult = { columns: ["actual"], rows: [{ actual: 1 }] };
  await withServer(executor, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dax/query`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "test-request" },
      body: JSON.stringify({ dax: "EVALUATE ROW(\"actual\", 1)", expectedColumns: ["actual"] }),
    });
    const payload = await response.json() as { data: { columns: string[]; rows: unknown[]; rowCount: number }; meta: { requestId: string; durationMs: number } };
    assert.equal(response.status, 200);
    assert.deepEqual(payload.data, { columns: ["actual"], rows: [{ actual: 1 }], rowCount: 1 });
    assert.equal(payload.meta.requestId, "test-request");
    assert.ok(payload.meta.durationMs >= 0);
    assert.equal("queryId" in (executor.singleInputs[0] ?? {}), false);
  });
});

test("batch failures are all-or-nothing and include the original failed query name", async () => {
  const executor = new StubExecutor();
  executor.error = new GatewayError("POWERBI_QUERY_FAILED", "Power BI rejected the DAX query.", 400, "employees");
  await withServer(executor, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dax/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queries: [
        { name: "overview", dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] },
        { name: "employees", dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] },
      ] }),
    });
    const payload = await response.json() as { success: boolean; error: { failedQueryName: string } };
    assert.equal(response.status, 400);
    assert.equal(payload.success, false);
    assert.equal(payload.error.failedQueryName, "employees");
    assert.equal("data" in payload, false);
  });
});

test("batch success is keyed by query name", async () => {
  const executor = new StubExecutor();
  executor.batchResult = {
    overview: { columns: ["actual"], rows: [{ actual: 1 }] },
    employees: { columns: ["employeeId"], rows: [] },
  };
  await withServer(executor, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dax/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queries: [
        { name: "overview", dax: "EVALUATE ROW(\"actual\", 1)", expectedColumns: ["actual"] },
        { name: "employees", dax: "EVALUATE FILTER({}, FALSE())", expectedColumns: ["employeeId"] },
      ] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, data: executor.batchResult });
  });
});

test("CORS allows configured origin and preflight, rejects others, and accepts no Origin", async () => {
  await withServer(new StubExecutor(), async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/api/dax/query`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const rejected = await fetch(`${baseUrl}/api/dax/query`, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
    });
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json() as { error: { code: string } }).error.code, "CORS_ORIGIN_DENIED");

    const noOrigin = await fetch(`${baseUrl}/api/health`);
    assert.equal(noOrigin.status, 200);
  });
});

test("invalid payload, service errors, and route 404 use request-ID error envelopes", async () => {
  const executor = new StubExecutor();
  await withServer(executor, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/dax/query`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    const invalidBody = await invalid.json() as { error: { code: string; requestId: string } };
    assert.equal(invalid.status, 400);
    assert.equal(invalidBody.error.code, "INVALID_REQUEST");
    assert.ok(invalidBody.error.requestId);

    const missing = await fetch(`${baseUrl}/missing`);
    const missingBody = await missing.json() as { error: { code: string; requestId: string } };
    assert.equal(missing.status, 404);
    assert.equal(missingBody.error.code, "ROUTE_NOT_FOUND");
    assert.ok(missingBody.error.requestId);
  });
});
