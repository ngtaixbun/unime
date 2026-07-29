import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDimKpiDax,
} from "../dax/dim-kpi.js";

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
