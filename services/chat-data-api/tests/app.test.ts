import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { getEnv } from "../src/config/env.js";

const credential = randomBytes(32).toString("hex");
const env = getEnv({ NODE_ENV: "test", CHAT_DATA_API_TEST_CREDENTIAL: credential });
let server: Server;
let baseUrl: string;

before(async () => {
  server = createApp(env).listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

function validBody(extra: Record<string, unknown> = {}) {
  return { apiVersion: "1", questionId: "coverage_store", parameters: { cycleKey: "202610", region: "ALL" }, ...extra };
}

async function post(body: unknown, authorization = `Bearer ${credential}`) {
  return fetch(`${baseUrl}/api/chat/v1/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization },
    body: JSON.stringify(body),
  });
}

describe("Chat Data API STEP 01", () => {
  it("returns the disabled-semantic contract for a valid authenticated request", async () => {
    const response = await post(validBody());
    assert.equal(response.status, 501);
    assert.deepEqual(await response.json(), {
      apiVersion: "1",
      questionId: "coverage_store",
      requestId: response.headers.get("x-request-id"),
      error: { code: "SEMANTIC_NOT_CONFIGURED", message: "Power BI integration is not configured yet." },
    });
  });

  it("accepts coverage_employee under the same disabled-semantic contract", async () => {
    const response = await post(validBody({ questionId: "coverage_employee" }));
    assert.equal(response.status, 501);
    const body = await response.json() as { questionId: string; error: { code: string } };
    assert.equal(body.questionId, "coverage_employee");
    assert.equal(body.error.code, "SEMANTIC_NOT_CONFIGURED");
  });

  for (const [name, body, expectedPath] of [
    ["invalid questionId", validBody({ questionId: "unknown" }), "questionId"],
    ["invalid region", { ...validBody(), parameters: { cycleKey: "202610", region: "NORTH" } }, "parameters.region"],
    ["invalid cycleKey", { ...validBody(), parameters: { cycleKey: "202613", region: "ALL" } }, "parameters.cycleKey"],
    ["unknown top-level parameter", validBody({ workspaceId: "arbitrary" }), ""],
    ["drill-down parameter", { ...validBody(), parameters: { cycleKey: "202610", region: "ALL", amm: "A" } }, "parameters"],
    ["arbitrary DAX", validBody({ dax: "EVALUATE ROW(\"secret\", 1)" }), ""],
  ] as const) {
    it(`rejects ${name}`, async () => {
      const response = await post(body);
      const json = await response.json() as { error: { code: string; details: { path: string }[] } };
      assert.equal(response.status, 400);
      assert.equal(json.error.code, "VALIDATION_ERROR");
      assert.ok(json.error.details.some((detail) => detail.path === expectedPath));
    });
  }

  it("rejects missing and invalid authentication without echoing credentials", async () => {
    for (const authorization of ["", "Bearer wrong-credential-value"]) {
      const response = await post(validBody(), authorization);
      const text = await response.text();
      assert.equal(response.status, 401);
      assert.doesNotMatch(text, new RegExp(`${credential}|wrong-credential`));
      assert.match(text, /UNAUTHORIZED/);
    }
  });

  it("fails closed when the development credential is absent", async () => {
    const isolated = createApp(getEnv({ NODE_ENV: "test" })).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => isolated.once("listening", resolve));
    const port = (isolated.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/chat/v1/query`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validBody()),
    });
    assert.equal(response.status, 503);
    assert.match(await response.text(), /AUTH_NOT_CONFIGURED/);
    await new Promise<void>((resolve) => isolated.close(() => resolve()));
  });

  it("uses and returns a validated body requestId", async () => {
    const response = await post(validBody({ requestId: "chat-request-202610-01" }));
    const json = await response.json() as { requestId: string };
    assert.equal(response.status, 501);
    assert.equal(response.headers.get("x-request-id"), "chat-request-202610-01");
    assert.equal(json.requestId, "chat-request-202610-01");
  });

  it("rejects an invalid body requestId", async () => {
    const response = await post(validBody({ requestId: "contains spaces" }));
    assert.equal(response.status, 400);
  });

  it("serves health without authentication, credentials, or semantic calls", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.match(text, /\"status\":\"ok\"/);
    assert.doesNotMatch(text, /credential|Power BI/i);
  });

  it("does not enable cross-origin access", async () => {
    const response = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://example.com" } });
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  it("returns stable JSON errors for malformed and oversized JSON", async () => {
    const malformed = await fetch(`${baseUrl}/api/chat/v1/query`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
      body: "{",
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json() as { error: { code: string } }).error.code, "INVALID_JSON");

    const oversized = await post(validBody({ padding: "x".repeat(17_000) }));
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json() as { error: { code: string } }).error.code, "PAYLOAD_TOO_LARGE");
  });
});
