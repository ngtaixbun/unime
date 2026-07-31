import assert from "node:assert/strict";

import {
  buildOverviewKpiSummaryDax,
} from "../dist/dax/overview-kpi-summary.js";

const allFiltersQuery =
  buildOverviewKpiSummaryDax({
    cycleKey: 202608,

    filters: {
      region: "all",
      amm: "all",
      supervisor: "all",
    },
  });

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

const numericSupervisorQuery =
  buildOverviewKpiSummaryDax({
    cycleKey: 202608,

    filters: {
      supervisor:
        "number:16365",
    },
  });

assert.match(
  numericSupervisorQuery,
  /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
);

assert.doesNotMatch(
  numericSupervisorQuery,
  /TREATAS\(\s*\{\s*"16365"\s*\},\s*'dimnv'\[sup_id\]/,
);

const stringFilterQuery =
  buildOverviewKpiSummaryDax({
    cycleKey: 202608,

    filters: {
      region:
        'string:R"01',
    },
  });

assert.match(
  stringFilterQuery,
  /\{\s*"R""01"\s*\}/,
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
    numericSupervisorQuery.includes(
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
    numericSupervisorQuery,
    new RegExp(
      `\\[${measureName}\\]\\s*\\*\\s*100`,
    ),
  );
}

assert.match(
  numericSupervisorQuery,
  /"actual"\s*,\s*\[Actual KPI Selected\]/,
);

assert.match(
  numericSupervisorQuery,
  /"target"\s*,\s*\[Target KPI Selected\]/,
);

console.log(
  "[OK] Overview KPI summary query self-check passed.",
);
