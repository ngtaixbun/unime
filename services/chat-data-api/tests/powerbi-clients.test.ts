import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConfidentialClientFabricAuthClient,
  POWER_BI_SCOPE,
} from "../src/clients/fabric-auth.client.js";
import { PowerBiHttpClient } from "../src/clients/powerbi.client.js";
import { SemanticError } from "../src/errors/semantic.error.js";

const config = {
  WORKSPACE_ID: "workspace-fixed",
  SEMANTIC_MODEL_ID: "model-fixed",
  POWERBI_TIMEOUT_MS: 1_000,
  POWERBI_MAX_RESPONSE_BYTES: 4_096,
};

describe("semantic authentication", () => {
  it("uses the fixed Power BI scope and caches a valid token", async () => {
    let calls = 0;
    const auth = new ConfidentialClientFabricAuthClient({
      async acquireTokenByClientCredential(request) {
        calls += 1;
        assert.deepEqual(request.scopes, [POWER_BI_SCOPE]);
        return { accessToken: "server-token", expiresOn: new Date(Date.now() + 300_000) };
      },
    });
    assert.equal(await auth.acquire(), "server-token");
    assert.equal(await auth.acquire(), "server-token");
    assert.equal(calls, 1);
  });

  it("maps credential failure without exposing its cause", async () => {
    const auth = new ConfidentialClientFabricAuthClient({
      async acquireTokenByClientCredential() { throw new Error("sensitive credential detail"); },
    });
    await assert.rejects(auth.acquire(), (error: unknown) => {
      assert.ok(error instanceof SemanticError);
      assert.equal(error.code, "SEMANTIC_AUTH_FAILED");
      assert.doesNotMatch(error.message, /sensitive/);
      return true;
    });
  });
});

describe("PowerBiHttpClient", () => {
  it("uses only the fixed endpoint and fixed DAX request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const client = new PowerBiHttpClient(config, {
      fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedInit = init;
        return Response.json({ results: [{ tables: [{ rows: [{ "[actual]": 1 }] }] }] });
      }) as typeof fetch,
    });
    assert.deepEqual(await client.executeQuery({ token: "secret-token", dax: "FIXED DAX" }), {
      rows: [{ "[actual]": 1 }],
    });
    assert.equal(capturedUrl, "https://api.powerbi.com/v1.0/myorg/groups/workspace-fixed/datasets/model-fixed/executeQueries");
    assert.equal((capturedInit?.headers as Record<string, string>).authorization, "Bearer secret-token");
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      queries: [{ query: "FIXED DAX" }],
      serializerSettings: { includeNulls: true },
    });
  });

  it("maps Power BI authorization failures safely", async () => {
    const client = new PowerBiHttpClient(config, {
      fetcher: (async () => new Response("sensitive upstream body", { status: 401 })) as typeof fetch,
    });
    await assert.rejects(client.executeQuery({ token: "token", dax: "FIXED" }), (error: unknown) => {
      assert.ok(error instanceof SemanticError);
      assert.equal(error.code, "SEMANTIC_AUTH_FAILED");
      assert.doesNotMatch(error.message, /sensitive/);
      return true;
    });
  });

  it("enforces timeout, caller abort, and response-size limits", async () => {
    const hangingFetcher = ((_: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch;
    const timeoutClient = new PowerBiHttpClient({ ...config, POWERBI_TIMEOUT_MS: 5 }, { fetcher: hangingFetcher });
    await assert.rejects(timeoutClient.executeQuery({ token: "t", dax: "FIXED" }), (error: unknown) =>
      error instanceof SemanticError && error.code === "SEMANTIC_TIMEOUT");

    const caller = new AbortController();
    const aborted = timeoutClient.executeQuery({ token: "t", dax: "FIXED", signal: caller.signal });
    caller.abort();
    await assert.rejects(aborted, (error: unknown) =>
      error instanceof SemanticError && error.code === "REQUEST_ABORTED");

    const oversizedClient = new PowerBiHttpClient({ ...config, POWERBI_MAX_RESPONSE_BYTES: 32 }, {
      fetcher: (async () => Response.json({ results: [{ tables: [{ rows: [{ value: "x".repeat(100) }] }] }] })) as typeof fetch,
    });
    await assert.rejects(oversizedClient.executeQuery({ token: "t", dax: "FIXED" }), (error: unknown) =>
      error instanceof SemanticError && error.code === "SEMANTIC_SCHEMA_MISMATCH");
  });

  it("rejects extra ExecuteQueries results and tables", async () => {
    for (const payload of [
      { results: [{ tables: [{ rows: [] }] }, { tables: [{ rows: [] }] }] },
      { results: [{ tables: [{ rows: [] }, { rows: [] }] }] },
    ]) {
      const client = new PowerBiHttpClient(config, {
        fetcher: (async () => Response.json(payload)) as typeof fetch,
      });
      await assert.rejects(client.executeQuery({ token: "t", dax: "FIXED" }), (error: unknown) =>
        error instanceof SemanticError && error.code === "SEMANTIC_SCHEMA_MISMATCH");
    }
  });
});
