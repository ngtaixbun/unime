import assert from "node:assert/strict";
import test from "node:test";
import type { PowerBiClient } from "../../src/clients/powerbi.client.js";
import { PowerBiQueryService } from "../../src/services/powerbi-query.service.js";
import { GatewayError } from "../../src/types/dax.js";
import { testEnv } from "../helpers.js";

function clientWithRows(rows: Array<Record<string, unknown>>): PowerBiClient {
  return {
    async executeQuery() {
      return { rows };
    },
  };
}

test("single query acquires a token and normalizes rows through the client", async () => {
  let token: string | undefined;
  const client: PowerBiClient = {
    async executeQuery(input) {
      token = input.token;
      return { rows: [{ "[x]": 1 }] };
    },
  };
  const service = new PowerBiQueryService(
    testEnv(),
    { async acquire() { return "token"; } },
    client,
  );
  const result = await service.executeQuery({ dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] });
  assert.equal(token, "token");
  assert.deepEqual(result, { columns: ["x"], rows: [{ x: 1 }] });
});

test("batch shares one token and preserves object rows by query name", async () => {
  let tokens = 0;
  const service = new PowerBiQueryService(testEnv(), {
    async acquire() { tokens += 1; return "token"; },
  }, clientWithRows([{ "[x]": 1 }]));
  const result = await service.executeBatch([
    { name: "one", dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] },
    { name: "two", dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] },
  ]);
  assert.equal(tokens, 1);
  assert.deepEqual(result.two?.rows, [{ x: 1 }]);
});

test("maps a client timeout without replacing it", async () => {
  const service = new PowerBiQueryService(testEnv(), {
    async acquire() { return "token"; },
  }, {
    async executeQuery() {
      throw new GatewayError("POWERBI_TIMEOUT", "Power BI query timed out.", 504);
    },
  });
  await assert.rejects(
    service.executeQuery({ dax: "EVALUATE ROW(\"x\", 1)", expectedColumns: ["x"] }),
    (error: unknown) => error instanceof GatewayError && error.code === "POWERBI_TIMEOUT" && error.statusCode === 504,
  );
});
