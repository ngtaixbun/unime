import assert from "node:assert/strict";

import {
  buildOverviewKpiSummaryDax,
} from "../dist/dax/overview-kpi-summary.js";

import {
  buildOverviewKpiTrendDax,
} from "../dist/dax/overview-kpi-trend.js";

const summaryRegressionQuery =
  buildOverviewKpiSummaryDax({
    cycleKey: 202608,

    filters: {
      supervisor:
        "number:16365",
    },
  });

assert.match(
  summaryRegressionQuery,
  /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
);

const allFiltersQuery =
  buildOverviewKpiTrendDax({
    cycleKey: 202608,

    filters: {
      region: "all",
      amm: "all",
      supervisor: "all",
    },
  });

assert.match(
  allFiltersQuery,
  /VALUES\('Date'\[Date\]\)/,
);

assert.match(
  allFiltersQuery,
  /'Date'\[Chu kỳ KPI Key\]/,
);

assert.doesNotMatch(
  allFiltersQuery,
  /'dimnv'\[Region ID\]/,
);

assert.doesNotMatch(
  allFiltersQuery,
  /'dimnv'\[amm_id\]/,
);

assert.doesNotMatch(
  allFiltersQuery,
  /'dimnv'\[sup_id\]/,
);

const organizationQuery =
  buildOverviewKpiTrendDax({
    cycleKey: 202608,

    filters: {
      region:
        "number:1",

      amm:
        "string:001",

      supervisor:
        "number:16365",
    },
  });

assert.match(
  organizationQuery,
  /TREATAS\(\s*\{\s*1\s*\},\s*'dimnv'\[Region ID\]/,
);

assert.match(
  organizationQuery,
  /TREATAS\(\s*\{\s*"001"\s*\},\s*'dimnv'\[amm_id\]/,
);

assert.match(
  organizationQuery,
  /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
);

assert.doesNotMatch(
  organizationQuery,
  /TREATAS\(\s*\{\s*"16365"\s*\},\s*'dimnv'\[sup_id\]/,
);

for (
  const placeholder of [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ]
) {
  assert.equal(
    organizationQuery.includes(
      placeholder,
    ),
    false,
  );
}

for (
  const measureName of [
    "mtd_call",
    "mtd_visit",
    "mtd_timespend",
    "mtd_osa",
    "mtd_qc",
  ]
) {
  assert.match(
    organizationQuery,
    new RegExp(
      `\\[${measureName}\\]\\s*\\*\\s*100`,
    ),
  );
}

assert.doesNotMatch(
  organizationQuery,
  /nvfail_/,
);

assert.match(
  organizationQuery,
  /"benchmark",\s*90(?:\.0)?/,
);

assert.match(
  organizationQuery,
  /VAR\s+_ValidTrendRows/,
);

assert.match(
  organizationQuery,
  /ORDER BY\s+\[Date\]\s+ASC/,
);

console.log(
  "[OK] Overview KPI trend query self-check passed.",
);