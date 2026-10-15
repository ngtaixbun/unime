import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CoverageStoreService,
  type CoverageAuthClient,
  type CoveragePowerBiClient,
} from "../src/services/coverage-store.service.js";
import { SemanticError } from "../src/errors/semantic.error.js";
import {
  dataCapabilityRegistry,
  classifyQuestionCapability,
  questionCapabilityRegistry,
  resolveQuestionCapability,
} from "../src/registry/data-capability.registry.js";

function marketRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...Object.fromEntries(dataCapabilityRegistry["market.summary"].expectedColumns.map((column) => [column, null])),
    "[coverage_shop]": 850,
    "[plan_shop]": 1_000,
    "[coverage_shop_perc]": 0.85,
    "[coverage_emp]": 92,
    "[plan_emp]": 100,
    "[coverage_emp_perc]": 0.92,
    ...overrides,
  };
}

function createService(rows: Array<Record<string, unknown>>) {
  const calls: Array<{ token: string; dax: string; signal?: AbortSignal }> = [];
  const authClient: CoverageAuthClient = {
    async acquire() {
      return "server-side-token";
    },
  };
  const powerBiClient: CoveragePowerBiClient = {
    async executeQuery(input) {
      calls.push(input);
      return { rows };
    },
  };
  return { service: new CoverageStoreService(authClient, powerBiClient), calls };
}

async function expectCoverageError(
  promise: Promise<unknown>,
  code: SemanticError["code"],
) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("CoverageStoreService", () => {
  it("executes the fixed nationwide query and returns percentage points", async () => {
    const { service, calls } = createService([marketRow()]);
    const abort = new AbortController();

    assert.deepEqual(await service.executeCoverageStore("202610", abort.signal), {
      actual: 850,
      plan: 1_000,
      coveragePercent: 85,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.token, "server-side-token");
    assert.equal(calls[0]?.signal?.aborted, false);
    assert.match(calls[0]?.dax ?? "", /TREATAS\(\{ _SelectedCycleKey \}, 'Date'\[Chu kỳ KPI Key\]\)/);
    assert.match(calls[0]?.dax ?? "", /NOT ISBLANK\('dimstore'\[ShopId\]\)/);
    assert.doesNotMatch(calls[0]?.dax ?? "", /__CHAT_VALIDATED_CYCLE_KEY__/);
  });

  it("keeps zero values as real data", async () => {
    const { service } = createService([marketRow({
      "[coverage_shop]": 0,
      "[plan_shop]": 0,
      "[coverage_shop_perc]": 0,
    })]);
    assert.deepEqual(await service.executeCoverageStore("202601"), {
      actual: 0,
      plan: 0,
      coveragePercent: 0,
    });
  });

  it("reuses the same market summary query and projects Employee Coverage", async () => {
    const { service, calls } = createService([marketRow()]);
    assert.deepEqual(await service.executeCoverage("coverage_employee", "202610"), {
      actual: 92,
      plan: 100,
      coveragePercent: 92,
    });
    assert.equal(calls.length, 1);
    const employeeQuery = calls[0]?.dax;

    const store = createService([marketRow()]);
    await store.service.executeCoverageStore("202610");
    assert.equal(employeeQuery, store.calls[0]?.dax);
  });

  it("preserves Employee zero values and rejects Employee BLANK", async () => {
    const zero = createService([marketRow({
      "[coverage_emp]": 0,
      "[plan_emp]": 0,
      "[coverage_emp_perc]": 0,
    })]);
    assert.deepEqual(await zero.service.executeCoverage("coverage_employee", "202610"), {
      actual: 0,
      plan: 0,
      coveragePercent: 0,
    });
    await expectCoverageError(
      createService([marketRow({ "[coverage_emp]": null })]).service
        .executeCoverage("coverage_employee", "202610"),
      "SEMANTIC_NO_DATA",
    );
  });

  it("reports absent and incomplete semantic values as no data", async () => {
    await expectCoverageError(
      createService([]).service.executeCoverageStore("202610"),
      "SEMANTIC_NO_DATA",
    );
    await expectCoverageError(
      createService([marketRow({ "[coverage_shop]": null, "[coverage_shop_perc]": null })])
        .service.executeCoverageStore("202610"),
      "SEMANTIC_NO_DATA",
    );
  });

  it("rejects extra rows, changed columns, and non-numeric values", async () => {
    const valid = marketRow({ "[coverage_shop]": 1, "[plan_shop]": 2, "[coverage_shop_perc]": 0.5 });
    await expectCoverageError(
      createService([valid, valid]).service.executeCoverageStore("202610"),
      "SEMANTIC_SCHEMA_MISMATCH",
    );
    await expectCoverageError(
      createService([{ ...valid, "[extra]": 1 }]).service.executeCoverageStore("202610"),
      "SEMANTIC_SCHEMA_MISMATCH",
    );
    await expectCoverageError(
      createService([{ ...valid, "[coverage_shop]": "1" }]).service.executeCoverageStore("202610"),
      "SEMANTIC_SCHEMA_MISMATCH",
    );
  });

  it("validates cycleKey before acquiring a token or calling Power BI", async () => {
    const { service, calls } = createService([]);
    await assert.rejects(service.executeCoverageStore("202610 EVALUATE ROW(\"x\", 1)"), /cycleKey/);
    assert.equal(calls.length, 0);
  });

  it("bounds token acquisition with the overall semantic timeout", async () => {
    const service = new CoverageStoreService(
      { acquire: () => new Promise<string>(() => undefined) },
      { executeQuery: async () => ({ rows: [] }) },
      5,
    );
    await expectCoverageError(service.executeCoverageStore("202610"), "SEMANTIC_TIMEOUT");
  });

  it("rejects a finite ratio whose percentage-point conversion overflows", async () => {
    await expectCoverageError(
      createService([marketRow({
        "[coverage_shop]": 1,
        "[plan_shop]": 1,
        "[coverage_shop_perc]": Number.MAX_VALUE,
      })]).service.executeCoverageStore("202610"),
      "SEMANTIC_SCHEMA_MISMATCH",
    );
  });
});

describe("Data Capability Registry", () => {
  it("maps coverage_store to the generated existing market summary capability", () => {
    assert.equal(questionCapabilityRegistry.coverage_store.capabilityId, "market.summary");
    assert.equal(dataCapabilityRegistry["market.summary"].sourceFactory, "src/queries/market.ts#market");
    assert.deepEqual(dataCapabilityRegistry["market.summary"].enabledChatScopes, ["NATIONWIDE"]);
    assert.deepEqual(dataCapabilityRegistry["market.summary"].enabledChatFilters, []);
    const resolved = resolveQuestionCapability("coverage_store", { cycleKey: "202612", scope: "NATIONWIDE" });
    assert.equal(resolved.query.match(/202612/g)?.length, 1);
    assert.match(resolved.query, /"coverage_shop", \[coverage_shop\]/);
    assert.match(resolved.query, /"plan_shop", \[plan_shop\]/);
    assert.match(resolved.query, /"coverage_shop_perc", \[coverage_shop_perc\]/);
    assert.doesNotMatch(resolved.query, /__CHAT_VALIDATED_CYCLE_KEY__/);
    assert.deepEqual(classifyQuestionCapability("not_mapped"), {
      status: "UNSUPPORTED",
      questionId: "not_mapped",
      reason: "No existing allowlisted Unime query capability is mapped to this question.",
    });
  });

  it("maps coverage_employee to the same generated market summary capability", () => {
    assert.equal(questionCapabilityRegistry.coverage_employee.capabilityId, "market.summary");
    assert.deepEqual(questionCapabilityRegistry.coverage_employee.responseProjection, {
      actual: "[coverage_emp]",
      plan: "[plan_emp]",
      coverageRatio: "[coverage_emp_perc]",
    });
    const store = resolveQuestionCapability("coverage_store", { cycleKey: "202610", scope: "NATIONWIDE" });
    const employee = resolveQuestionCapability("coverage_employee", { cycleKey: "202610", scope: "NATIONWIDE" });
    assert.equal(employee.query, store.query);
    assert.equal(employee.capability.sourceHash, store.capability.sourceHash);
    assert.ok(employee.capability.expectedColumns.includes("[coverage_emp]"));
    assert.ok(employee.capability.expectedColumns.includes("[plan_emp]"));
    assert.ok(employee.capability.expectedColumns.includes("[coverage_emp_perc]"));
  });
});
