import assert from "node:assert/strict";
import test from "node:test";
import type { PowerBiClient } from "../../src/clients/powerbi.client.js";
import { PowerBiQueryService } from "../../src/services/powerbi-query.service.js";
import { GatewayError } from "../../src/types/dax.js";
import { testEnv } from "../helpers.js";

test("concurrent batch reports the first real failed query rather than an aborted sibling", async () => {
  const client: PowerBiClient = {
    async executeQuery(input) {
      if (input.dax.includes("bad")) {
        throw new GatewayError("POWERBI_QUERY_FAILED", "Power BI rejected the DAX query.", 400);
      }
      await new Promise((_resolve, reject) => {
        input.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
      throw new DOMException("Aborted", "AbortError");
    },
  };
  const service = new PowerBiQueryService(
    testEnv({ BATCH_CONCURRENCY: 2 }),
    { async acquire() { return "shared-token"; } },
    client,
  );
  await assert.rejects(
    service.executeBatch([
      { name: "bad-query", dax: "bad", expectedColumns: ["x"] },
      { name: "slow-query", dax: "slow", expectedColumns: ["x"] },
    ]),
    (error: unknown) => error instanceof GatewayError &&
      error.code === "POWERBI_QUERY_FAILED" && error.failedQueryName === "bad-query",
  );
});
