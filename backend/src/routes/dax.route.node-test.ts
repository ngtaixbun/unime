import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDimKpiDax,
} from "../dax/dim-kpi.js";

import {
  buildOverviewKpiSummaryDax,
} from "../dax/overview-kpi-summary.js";

import {
  buildTeamEmployeeKpiDax,
} from "../dax/team-employee-kpi.js";

import {
  buildRegisteredDaxQuery,
  daxQueryRequestSchema,
} from "./dax.route.js";

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
