import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

process.env.NODE_ENV = "test";
process.env.POWERBI_TENANT_ID = "11111111-1111-4111-8111-111111111111";
process.env.POWERBI_CLIENT_ID = "22222222-2222-4222-8222-222222222222";
process.env.POWERBI_CLIENT_SECRET = "test-secret";
process.env.POWERBI_WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
process.env.POWERBI_DATASET_ID = "44444444-4444-4444-8444-444444444444";
process.env.CORS_ORIGINS =
  "http://localhost:5173, http://localhost:5174";

const { app } = await import("../app.js");

let baseUrl = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

async function preflight(origin?: string): Promise<Response> {
  const headers = new Headers({
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  });
  if (origin) headers.set("Origin", origin);

  return fetch(`${baseUrl}/api/dax/query`, {
    method: "OPTIONS",
    headers,
  });
}

test("allows both configured Vite development origins", async () => {
  for (const origin of [
    "http://localhost:5173",
    "http://localhost:5174",
  ]) {
    const response = await preflight(origin);

    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      origin,
    );
    assert.match(
      response.headers.get("access-control-allow-methods") ?? "",
      /\bPOST\b/,
    );
    assert.match(
      response.headers.get("access-control-allow-headers") ?? "",
      /content-type/i,
    );
  }
});

test("rejects origins outside the exact allowlist", async () => {
  const response = await preflight("http://localhost.evil.example:5174");
  const payload = await response.json() as {
    error?: { code?: string };
  };

  assert.equal(response.status, 403);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    null,
  );
  assert.equal(payload.error?.code, "CORS_ORIGIN_DENIED");
});

test("accepts server-to-server requests without an Origin header", async () => {
  const response = await preflight();

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    null,
  );
});
