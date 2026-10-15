import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EnvironmentValidationError, getEnv } from "../src/config/env.js";

describe("environment validation", () => {
  it("uses the isolated local defaults", () => {
    assert.deepEqual(getEnv({}), {
      NODE_ENV: "development",
      PORT: 3101,
      CHAT_HOST: "127.0.0.1",
      CHAT_SEMANTIC_ENABLED: false,
      CHAT_ENTRA_CLOCK_TOLERANCE_SECONDS: 30,
      CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS: 3_600,
      CHAT_ENTRA_JWKS_CACHE_MS: 600_000,
      CHAT_ENTRA_JWKS_COOLDOWN_MS: 30_000,
      CHAT_ENTRA_JWKS_TIMEOUT_MS: 5_000,
      CHAT_RATE_LIMIT_WINDOW_MS: 60_000,
      CHAT_RATE_LIMIT_MAX_REQUESTS: 60,
      CHAT_RATE_LIMIT_MAX_CLIENTS: 10_000,
      CHAT_SEMANTIC_MAX_CONCURRENCY: 4,
      CHAT_SEMANTIC_MAX_QUEUE: 16,
      CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: 5_000,
      CHAT_REQUEST_TIMEOUT_MS: 65_000,
      CHAT_MAX_RESPONSE_BYTES: 16_384,
      CHAT_REQUIRE_HTTPS: false,
      CHAT_TRUST_PROXY_HOPS: 0,
      CHAT_POWERBI_TIMEOUT_MS: 60_000,
      CHAT_POWERBI_MAX_RESPONSE_BYTES: 262_144,
    });
  });

  it("rejects invalid ports and short credentials", () => {
    assert.throws(
      () => getEnv({ PORT: "70000", CHAT_DATA_API_TEST_CREDENTIAL: "short" }),
      (error) => error instanceof EnvironmentValidationError
        && error.fields.includes("PORT")
        && error.fields.includes("CHAT_DATA_API_TEST_CREDENTIAL"),
    );
  });

  it("requires fixed Power BI configuration only when semantics are enabled", () => {
    assert.throws(
      () => getEnv({ CHAT_SEMANTIC_ENABLED: "true" }),
      (error) => error instanceof EnvironmentValidationError
        && error.fields.includes("CHAT_POWERBI_TENANT_ID")
        && error.fields.includes("CHAT_POWERBI_SEMANTIC_MODEL_ID"),
    );
  });

  it("fails production closed until authentication, HTTPS, semantics and safeguards are explicit", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.throws(
      () => getEnv({
        NODE_ENV: "production",
        CHAT_SEMANTIC_ENABLED: "true",
        CHAT_POWERBI_TENANT_ID: id,
        CHAT_POWERBI_CLIENT_ID: id,
        CHAT_POWERBI_CLIENT_SECRET: "server-secret",
        CHAT_POWERBI_WORKSPACE_ID: id,
        CHAT_POWERBI_SEMANTIC_MODEL_ID: id,
      }),
      (error) => error instanceof EnvironmentValidationError
        && error.fields.includes("CHAT_ENTRA_TENANT_ID")
        && error.fields.includes("CHAT_REQUIRE_HTTPS")
        && error.fields.includes("CHAT_RATE_LIMIT_MAX_REQUESTS"),
    );
  });

  it("accepts complete production prerequisites and rejects a local credential", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const complete = {
      NODE_ENV: "production", CHAT_SEMANTIC_ENABLED: "true", CHAT_REQUIRE_HTTPS: "true",
      CHAT_ENTRA_TENANT_ID: id, CHAT_ENTRA_API_AUDIENCE: "api://chat-data",
      CHAT_ENTRA_ALLOWED_CLIENT_IDS: id,
      CHAT_POWERBI_TENANT_ID: id, CHAT_POWERBI_CLIENT_ID: id,
      CHAT_POWERBI_CLIENT_SECRET: "server-secret", CHAT_POWERBI_WORKSPACE_ID: id,
      CHAT_POWERBI_SEMANTIC_MODEL_ID: id,
      CHAT_RATE_LIMIT_WINDOW_MS: "60000", CHAT_RATE_LIMIT_MAX_REQUESTS: "60",
      CHAT_SEMANTIC_MAX_CONCURRENCY: "4", CHAT_SEMANTIC_MAX_QUEUE: "16",
      CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: "5000", CHAT_REQUEST_TIMEOUT_MS: "65000",
      CHAT_MAX_RESPONSE_BYTES: "16384",
    };
    assert.equal(getEnv(complete).NODE_ENV, "production");
    assert.throws(
      () => getEnv({ ...complete, CHAT_DATA_API_TEST_CREDENTIAL: "local-only-credential" }),
      (error) => error instanceof EnvironmentValidationError
        && error.fields.includes("CHAT_DATA_API_TEST_CREDENTIAL"),
    );
  });

  it("binds beyond loopback only in production", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const production = {
      NODE_ENV: "production", CHAT_REQUIRE_HTTPS: "true",
      CHAT_ENTRA_TENANT_ID: id, CHAT_ENTRA_API_AUDIENCE: "api://chat-data",
      CHAT_ENTRA_ALLOWED_CLIENT_IDS: id,
      CHAT_RATE_LIMIT_WINDOW_MS: "60000", CHAT_RATE_LIMIT_MAX_REQUESTS: "60",
      CHAT_SEMANTIC_MAX_CONCURRENCY: "4", CHAT_SEMANTIC_MAX_QUEUE: "16",
      CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: "5000", CHAT_REQUEST_TIMEOUT_MS: "65000",
      CHAT_MAX_RESPONSE_BYTES: "16384",
    };
    assert.equal(getEnv({ ...production, CHAT_HOST: "0.0.0.0" }).CHAT_HOST, "0.0.0.0");
    assert.equal(getEnv({ CHAT_HOST: "::1" }).CHAT_HOST, "::1");
    for (const source of [{ CHAT_HOST: "0.0.0.0" }, { NODE_ENV: "test", CHAT_HOST: "::" }, { CHAT_HOST: "localhost" }]) {
      assert.throws(
        () => getEnv(source),
        (error) => error instanceof EnvironmentValidationError && error.fields.includes("CHAT_HOST"),
      );
    }
  });

  it("keeps production semantic execution disabled by default", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const env = getEnv({
      NODE_ENV: "production", CHAT_REQUIRE_HTTPS: "true",
      CHAT_ENTRA_TENANT_ID: id, CHAT_ENTRA_API_AUDIENCE: "api://chat-data",
      CHAT_ENTRA_ALLOWED_CLIENT_IDS: id,
      CHAT_RATE_LIMIT_WINDOW_MS: "60000", CHAT_RATE_LIMIT_MAX_REQUESTS: "60",
      CHAT_SEMANTIC_MAX_CONCURRENCY: "4", CHAT_SEMANTIC_MAX_QUEUE: "16",
      CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: "5000", CHAT_REQUEST_TIMEOUT_MS: "65000",
      CHAT_MAX_RESPONSE_BYTES: "16384",
    });
    assert.equal(env.CHAT_SEMANTIC_ENABLED, false);
  });

  it("parses the semantic flag strictly", () => {
    assert.throws(() => getEnv({ CHAT_SEMANTIC_ENABLED: "yes" }), EnvironmentValidationError);
  });
});
