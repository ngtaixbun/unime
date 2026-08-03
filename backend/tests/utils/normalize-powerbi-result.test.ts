import assert from "node:assert/strict";
import test from "node:test";
import { GatewayError } from "../../src/types/dax.js";
import { normalizeColumnName, normalizePowerBiResult } from "../../src/utils/normalize-powerbi-result.js";

test("normalizes bracket and table-prefixed columns", () => {
  assert.equal(normalizeColumnName("[actual]"), "actual");
  assert.equal(normalizeColumnName("Table[actual]"), "actual");
  assert.equal(normalizeColumnName("'Table'[actual]"), "actual");
});

test("preserves null separately from zero and keeps native numbers", () => {
  const result = normalizePowerBiResult([{ "[blank]": null, "[zero]": 0 }], ["blank", "zero"]);
  assert.deepEqual(result, { columns: ["blank", "zero"], rows: [{ blank: null, zero: 0 }] });
});

test("empty rows retain expected columns", () => {
  assert.deepEqual(normalizePowerBiResult([], ["actual", "target"]), {
    columns: ["actual", "target"], rows: [],
  });
});

test("expected-column mismatch is rejected", () => {
  assert.throws(
    () => normalizePowerBiResult([{ "[actual]": 1 }], ["target"]),
    (error: unknown) => error instanceof GatewayError && error.code === "POWERBI_SCHEMA_MISMATCH",
  );
});

test("normalized column collisions are rejected", () => {
  assert.throws(
    () => normalizePowerBiResult([{ "[actual]": 1, "Table[actual]": 2 }], ["actual"]),
    (error: unknown) => error instanceof GatewayError && error.code === "POWERBI_SCHEMA_MISMATCH",
  );
});
