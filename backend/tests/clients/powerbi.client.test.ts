import assert from "node:assert/strict";
import test from "node:test";
import { PowerBiHttpClient } from "../../src/clients/powerbi.client.js";
import { GatewayError } from "../../src/types/dax.js";
import { testEnv } from "../helpers.js";

test("builds the ExecuteQueries URL and forwards token and DAX body", async () => {
  let receivedUrl = "";
  let receivedHeaders: Record<string, string> = {};
  let receivedBody: unknown;
  const fetcher: typeof fetch = async (input, init) => {
    receivedUrl = String(input);
    receivedHeaders = Object.fromEntries(Object.entries(init?.headers ?? {}));
    receivedBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      results: [{ tables: [{ rows: [{ "[x]": 1 }] }] }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PowerBiHttpClient(testEnv(), { fetcher });
  const result = await client.executeQuery({ token: "abc", dax: "EVALUATE ROW(\"x\", 1)" });
  assert.equal(
    receivedUrl,
    "https://api.powerbi.com/v1.0/myorg/groups/33333333-3333-4333-8333-333333333333/datasets/44444444-4444-4444-8444-444444444444/executeQueries",
  );
  assert.equal(receivedHeaders.authorization, "Bearer abc");
  assert.equal((receivedBody as { serializerSettings: { includeNulls: boolean } }).serializerSettings.includeNulls, true);
  assert.equal((receivedBody as { queries: Array<{ query: string }> }).queries[0]?.query, 'EVALUATE ROW("x", 1)');
  assert.deepEqual(result.rows, [{ "[x]": 1 }]);
});

test("maps upstream 400 to POWERBI_QUERY_FAILED", async () => {
  const client = new PowerBiHttpClient(testEnv(), {
    fetcher: async () => new Response(JSON.stringify({
      error: { code: "DatasetExecuteQueriesError", message: "DAX syntax is invalid." },
    }), { status: 400, statusText: "Bad Request" }),
  });
  await assert.rejects(
    client.executeQuery({ token: "t", dax: "x" }),
    (error: unknown) =>
      error instanceof GatewayError &&
      error.code === "POWERBI_QUERY_FAILED" &&
      error.statusCode === 400 &&
      error.details?.upstreamStatus === 400 &&
      error.details?.upstreamCode === "DatasetExecuteQueriesError" &&
      error.details?.upstreamMessage === "DAX syntax is invalid.",
  );
});

test("maps upstream 429 to POWERBI_RATE_LIMITED with 503", async () => {
  const client = new PowerBiHttpClient(testEnv(), {
    fetcher: async () => new Response("{}", { status: 429 }),
  });
  await assert.rejects(
    client.executeQuery({ token: "t", dax: "x" }),
    (error: unknown) => error instanceof GatewayError && error.code === "POWERBI_RATE_LIMITED" && error.statusCode === 503,
  );
});

test("maps network failures to POWERBI_UPSTREAM_ERROR with safe details", async () => {
  const client = new PowerBiHttpClient(testEnv(), {
    fetcher: async () => {
      throw new TypeError("fetch failed");
    },
  });
  await assert.rejects(
    client.executeQuery({ token: "t", dax: "x" }),
    (error: unknown) =>
      error instanceof GatewayError &&
      error.code === "POWERBI_UPSTREAM_ERROR" &&
      error.statusCode === 502 &&
      error.details?.source === "powerbi" &&
      error.details?.failure === "fetch" &&
      error.details?.causeName === "TypeError" &&
      error.details?.causeMessage === "fetch failed",
  );
});
