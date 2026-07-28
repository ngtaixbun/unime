import assert from "node:assert/strict";

import {
  buildDimAmmDax,
} from "../dist/dax/dim-amm.js";

import {
  buildDimDateDax,
} from "../dist/dax/dim-date.js";

import {
  buildDimRegionDax,
} from "../dist/dax/dim-region.js";

import {
  buildDimSupervisorDax,
} from "../dist/dax/dim-supervisor.js";

const dimDate =
  buildDimDateDax();

assert.match(
  dimDate,
  /"cycleKey"/,
);

assert.match(
  dimDate,
  /"isLatestCycle"/,
);

assert.match(
  dimDate,
  /ORDER BY\s+\[cycleSort\]\s+ASC/,
);

const dimRegion =
  buildDimRegionDax();

assert.match(
  dimRegion,
  /"regionId"/,
);

assert.match(
  dimRegion,
  /"regionLabel"/,
);

const dimAmmAll =
  buildDimAmmDax({
    region: "all",
  });

assert.doesNotMatch(
  dimAmmAll,
  /TREATAS\(/,
);

const dimAmmSelected =
  buildDimAmmDax({
    region: "number:1",
  });

assert.match(
  dimAmmSelected,
  /TREATAS\(\s*\{\s*1\s*\},\s*'dimnv'\[Region ID\]/,
);

const dimSupervisor =
  buildDimSupervisorDax({
    region: "number:1",
    amm: "string:001",
  });

assert.match(
  dimSupervisor,
  /TREATAS\(\s*\{\s*1\s*\},\s*'dimnv'\[Region ID\]/,
);

assert.match(
  dimSupervisor,
  /TREATAS\(\s*\{\s*"001"\s*\},\s*'dimnv'\[amm_id\]/,
);

assert.doesNotMatch(
  dimSupervisor,
  /__REGION_FILTER__|__AMM_FILTER__/,
);

console.log(
  "[OK] Dimension query self-check passed.",
);