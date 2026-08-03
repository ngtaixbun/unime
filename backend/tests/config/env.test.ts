import assert from "node:assert/strict";
import test from "node:test";
import { EnvironmentValidationError, parseEnv } from "../../src/config/env.js";

const valid = {
  NODE_ENV: "test",
  TENANT_ID: "11111111-1111-4111-8111-111111111111",
  CLIENT_ID: "22222222-2222-4222-8222-222222222222",
  CLIENT_SECRET: "do-not-print",
  WORKSPACE_ID: "33333333-3333-4333-8333-333333333333",
  SEMANTIC_MODEL_ID: "44444444-4444-4444-8444-444444444444",
};

test("validates environment and combines CORS_ORIGINS with legacy CORS_ORIGIN", () => {
  const env = parseEnv({ ...valid, CORS_ORIGINS: "https://one.example", CORS_ORIGIN: "https://two.example" });
  assert.equal(env.PORT, 3_000);
  assert.ok(env.corsOrigins.includes("http://localhost:5173"));
  assert.ok(env.corsOrigins.includes("http://127.0.0.1:5173"));
  assert.ok(env.corsOrigins.includes("https://still-coast-29a4a239b5-southeastasia.webapp.fabricapps.net"));
  assert.ok(env.corsOrigins.includes("https://firm-thyme-e1ecf93bc7-southeastasia.webapp.fabricapps.net"));
  assert.ok(env.corsOrigins.includes("https://app.fabric.microsoft.com"));
  assert.ok(env.corsOrigins.includes("https://one.example"));
  assert.ok(env.corsOrigins.includes("https://two.example"));
});

test("missing environment fields list names without values", () => {
  assert.throws(
    () => parseEnv({ CLIENT_SECRET: "do-not-print" }),
    (error: unknown) => error instanceof EnvironmentValidationError &&
      error.fields.includes("TENANT_ID") && !error.message.includes("do-not-print"),
  );
});
