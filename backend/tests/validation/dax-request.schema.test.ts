import assert from "node:assert/strict";
import test from "node:test";
import { createDaxRequestSchemas } from "../../src/validation/dax-request.schema.js";
import { testEnv } from "../helpers.js";

test("rejects missing, blank, and legacy-shaped DAX payloads", () => {
  const { single } = createDaxRequestSchemas(testEnv());
  assert.equal(single.safeParse({}).success, false);
  assert.equal(single.safeParse({ dax: "  " }).success, false);
  assert.equal(single.safeParse({ query: "EVALUATE ROW(\"x\", 1)" }).success, false);
  assert.equal(single.safeParse({ dax: "EVALUATE ROW(\"x\", 1)", extra: true }).success, false);
});

test("enforces UTF-8 DAX byte limit", () => {
  const { single } = createDaxRequestSchemas(testEnv({ DAX_MAX_LENGTH_BYTES: 4 }));
  assert.equal(single.safeParse({ dax: "éé" }).success, true);
  assert.equal(single.safeParse({ dax: "ééé" }).success, false);
});

test("rejects batch count overflow and duplicate or missing names", () => {
  const { batch } = createDaxRequestSchemas(testEnv({ BATCH_MAX_QUERIES: 1, BATCH_CONCURRENCY: 1 }));
  const query = { name: "one", dax: "EVALUATE ROW(\"x\", 1)" };
  assert.equal(batch.safeParse({ queries: [query, { ...query, name: "two" }] }).success, false);
  assert.equal(batch.safeParse({ queries: [{ dax: query.dax }] }).success, false);
  const schemas = createDaxRequestSchemas(testEnv());
  assert.equal(schemas.batch.safeParse({ queries: [query, query] }).success, false);
});
