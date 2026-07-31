import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDimKpiDax,
} from "../dax/dim-kpi.js";

import {
  buildOverviewKpiSummaryDax,
  overviewKpiSummaryColumns,
} from "../dax/overview-kpi-summary.js";

import {
  buildTeamEmployeeKpiDax,
} from "../dax/team-employee-kpi.js";

import {
  buildRegisteredDaxQuery,
  daxQueryRequestSchema,
  genericDaxExecuteRequestSchema,
} from "./dax.route.js";

import {
  assertPowerBiQueryResultColumns,
  PowerBiServiceError,
  toPowerBiTabularQueryResult,
} from "../services/powerbi-query.js";

import {
  resolveGenericDaxEnabled,
} from "../config/env.js";

test("dim-kpi DAX selects the semantic aliases used by the client", () => {
  const dax =
    buildDimKpiDax();

  assert.match(
    dax,
    /SELECTCOLUMNS\s*\(\s*'KPIname'/,
  );

  assert.match(
    dax,
    /"kpiname"\s*,\s*'KPIname'\[KPI\]/,
  );

  assert.match(
    dax,
    /"kpi_id"\s*,\s*'KPIname'\[num\]/,
  );
});

test("dim-kpi request schema accepts only an empty params object", () => {
  const request =
    daxQueryRequestSchema.parse({
      queryId: "dim-kpi",
      params: {},
    });

  assert.deepEqual(
    request,
    {
      queryId: "dim-kpi",
      params: {},
    },
  );

  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId: "dim-kpi",
        params: {
          cycleKey: 202608,
        },
      }),
  );
});

test("dim-kpi queryId dispatches to the registered DAX builder", () => {
  const request =
    daxQueryRequestSchema.parse({
      queryId: "dim-kpi",
      params: {},
    });

  assert.equal(
    buildRegisteredDaxQuery(
      request,
    ),
    buildDimKpiDax(),
  );
});

test("overview-kpi-summary accepts selected kpiId and dispatches the eighteen-column query", () => {
  const request =
    daxQueryRequestSchema.parse({
      queryId:
        "overview-kpi-summary",

      params: {
        cycleKey:
          202608,
        kpiId:
          5,
        region:
          "number:1",
        amm:
          "all",
        supervisor:
          "all",
      },
    });

  const dax =
    buildRegisteredDaxQuery(
      request,
    );

  assert.equal(
    dax,
    buildOverviewKpiSummaryDax({
      cycleKey:
        202608,
      kpiId:
        5,
      filters: {
        region:
          "number:1",
        amm:
          "all",
        supervisor:
          "all",
      },
    }),
  );

  assert.match(
    dax,
    /"mtdKpiSelected"/,
  );

  assert.match(
    dax,
    /"contributionNv"/,
  );

  assert.match(
    dax,
    /"actual"\s*,\s*\[Actual KPI Selected\]/,
  );

  assert.match(
    dax,
    /"target"\s*,\s*\[Target KPI Selected\]/,
  );

  assert.match(
    dax,
    /VAR\s+_SelectedKpiId\s*=\s*5/,
  );

  assert.match(
    dax,
    /TREATAS\(\s*\{\s*_SelectedKpiId\s*\}/,
  );

  assert.equal(
    overviewKpiSummaryColumns.length,
    18,
  );

  assert.deepEqual(
    overviewKpiSummaryColumns.slice(
      -2,
    ),
    [
      "actual",
      "target",
    ],
  );
});

test("overview-kpi-summary rejects the deployed legacy sixteen-column result", () => {
  const legacyColumns =
    overviewKpiSummaryColumns.slice(
      0,
      16,
    );

  assert.throws(
    () =>
      assertPowerBiQueryResultColumns(
        {
          columns: [
            ...legacyColumns,
          ],
          rows: [],
        },
        overviewKpiSummaryColumns,
      ),
    (
      error: unknown,
    ) =>
      error instanceof
        PowerBiServiceError &&
      error.code ===
        "POWERBI_SCHEMA_MISMATCH" &&
      error.statusCode === 502 &&
      error.message ===
        "Power BI thiếu cột actual.",
  );
});

test("team-employee-kpi schema dispatches the registered employee-grain DAX builder", () => {
  const request =
    daxQueryRequestSchema.parse({
      queryId:
        "team-employee-kpi",

      params: {
        cycleKey:
          "2026-08",
        kpiId:
          4,
        region:
          "number:7",
        amm:
          "string:AMM North",
        supervisor:
          "number:42",
      },
    });

  const dax =
    buildRegisteredDaxQuery(
      request,
    );

  assert.equal(
    dax,
    buildTeamEmployeeKpiDax({
      cycleKey:
        "2026-08",
      kpiId:
        4,
      filters: {
        region:
          "number:7",
        amm:
          "string:AMM North",
        supervisor:
          "number:42",
      },
    }),
  );

  assert.match(
    dax,
    /VAR\s+_SelectedCycleKey\s*=\s*"2026-08"/,
  );

  assert.match(
    dax,
    /VAR\s+_SelectedKpiId\s*=\s*4/,
  );

  assert.match(
    dax,
    /'dimnv'\[Employee_Id\]/,
  );

  assert.match(
    dax,
    /'dimnv'\[FullName\]/,
  );

  assert.match(
    dax,
    /\[Actual KPI Selected\]/,
  );

  assert.match(
    dax,
    /\[Target KPI Selected\]/,
  );

  assert.match(
    dax,
    /\[MTD KPI Selected\]/,
  );

  assert.match(
    dax,
    /\{ 7 \}\s*,\s*'dimnv'\[Region ID\]/,
  );

  assert.match(
    dax,
    /\{ "AMM North" \}\s*,\s*'dimnv'\[amm_id\]/,
  );

  assert.match(
    dax,
    /\{ 42 \}\s*,\s*'dimnv'\[sup_id\]/,
  );

  assert.doesNotMatch(
    dax,
    /__[A-Z_]+__/,
  );
});

test("team-employee-kpi schema rejects invalid cycleKey, kpiId, and organization filters", () => {
  const validParams = {
    cycleKey:
      202608,
    kpiId:
      2,
    region:
      "all",
    amm:
      "all",
    supervisor:
      "all",
  } as const;

  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId:
          "team-employee-kpi",
        params: {
          ...validParams,
          cycleKey:
            "   ",
        },
      }),
  );

  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId:
          "team-employee-kpi",
        params: {
          ...validParams,
          kpiId:
            0,
        },
      }),
  );

  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId:
          "team-employee-kpi",
        params: {
          ...validParams,
          supervisor:
            "north",
        },
      }),
  );
});

test("generic DAX schema preserves the query and exact expected column names", () => {
  const request =
    genericDaxExecuteRequestSchema
      .parse({
        query:
          "EVALUATE ROW(\"KPI\", 1)",

        expectedColumns: [
          "[KPI]",
          "Dim Date[Cycle Label]",
        ],
      });

  assert.deepEqual(
    request,
    {
      query:
        "EVALUATE ROW(\"KPI\", 1)",

      expectedColumns: [
        "[KPI]",
        "Dim Date[Cycle Label]",
      ],
    },
  );
});

test("generic DAX defaults off and rejects unsafe production enablement", () => {
  assert.equal(
    resolveGenericDaxEnabled(
      undefined,
      "production",
    ),
    false,
  );

  assert.throws(
    () =>
      resolveGenericDaxEnabled(
        "true",
        "production",
      ),
    /inbound authentication/,
  );

  assert.equal(
    resolveGenericDaxEnabled(
      undefined,
      "development",
    ),
    true,
  );
});

test("generic DAX schema rejects duplicate columns and extra fields", () => {
  assert.throws(
    () =>
      genericDaxExecuteRequestSchema
        .parse({
          query:
            "EVALUATE ROW(\"KPI\", 1)",

          expectedColumns: [
            "[KPI]",
            "[KPI]",
          ],
        }),
  );

  assert.throws(
    () =>
      genericDaxExecuteRequestSchema
        .parse({
          query:
            "EVALUATE ROW(\"KPI\", 1)",

          expectedColumns: [
            "[KPI]",
          ],

          queryId:
            "dim-kpi",
        }),
  );
});

test("generic DAX result is row-major and preserves exact column names and values", () => {
  const result =
    toPowerBiTabularQueryResult(
      [
        {
          "[KPI]": null,
          "Dim Date[Cycle Label]":
            "Tháng 08",
        },
      ],
      [
        "[KPI]",
        "Dim Date[Cycle Label]",
      ],
    );

  assert.deepEqual(
    result,
    {
      columns: [
        "[KPI]",
        "Dim Date[Cycle Label]",
      ],

      rows: [
        [
          null,
          "Tháng 08",
        ],
      ],
    },
  );
});

test("generic DAX empty results retain their expected schema", () => {
  assert.deepEqual(
    toPowerBiTabularQueryResult(
      [],
      [
        "[KPI]",
      ],
    ),
    {
      columns: [
        "[KPI]",
      ],
      rows: [],
    },
  );
});

test("generic DAX result rejects a response that is missing an expected column", () => {
  assert.throws(
    () =>
      toPowerBiTabularQueryResult(
        [
          {
            "[KPI]": 1,
          },
        ],
        [
          "[KPI]",
          "[Missing]",
        ],
      ),
    (
      error: unknown,
    ) =>
      error instanceof
        PowerBiServiceError &&
      error.code ===
        "POWERBI_SCHEMA_MISMATCH" &&
      error.statusCode === 502,
  );
});

test("team-employee-kpi dispatches one employee-grain Semantic query with all filters", () => {
  const request =
    daxQueryRequestSchema.parse({
      queryId:
        "team-employee-kpi",

      params: {
        cycleKey:
          202608,
        kpiId:
          4,
        region:
          "number:1",
        amm:
          "string:AMM-01",
        supervisor:
          "number:16365",
      },
    });

  const dax =
    buildRegisteredDaxQuery(
      request,
    );

  assert.equal(
    dax,
    buildTeamEmployeeKpiDax({
      cycleKey:
        202608,
      kpiId:
        4,
      filters: {
        region:
          "number:1",
        amm:
          "string:AMM-01",
        supervisor:
          "number:16365",
      },
    }),
  );

  for (
    const column of [
      "Employee_Id",
      "FullName",
      "Region ID",
      "amm_id",
      "sup_id",
    ]
  ) {
    assert.match(
      dax,
      new RegExp(
        column.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );
  }

  for (
    const measure of [
      "Actual KPI Selected",
      "Target KPI Selected",
      "MTD KPI Selected",
    ]
  ) {
    assert.match(
      dax,
      new RegExp(
        `\\[${measure}\\]`,
      ),
    );
  }

  assert.match(
    dax,
    /TREATAS\(\s*\{\s*1\s*\},\s*'dimnv'\[Region ID\]/,
  );

  assert.match(
    dax,
    /TREATAS\(\s*\{\s*"AMM-01"\s*\},\s*'dimnv'\[amm_id\]/,
  );

  assert.match(
    dax,
    /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
  );
});

test("team-employee-kpi rejects invalid kpiId and encoded filters", () => {
  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId:
          "team-employee-kpi",

        params: {
          cycleKey:
            202608,
          kpiId:
            0,
          region:
            "all",
          amm:
            "all",
          supervisor:
            "all",
        },
      }),
  );

  assert.throws(
    () =>
      daxQueryRequestSchema.parse({
        queryId:
          "team-employee-kpi",

        params: {
          cycleKey:
            202608,
          kpiId:
            1,
          region:
            "North",
          amm:
            "all",
          supervisor:
            "all",
        },
      }),
  );
});
