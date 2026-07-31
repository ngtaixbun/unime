# Team KPI dimension semantic source of truth

## Scope

The Team overview uses the Power BI Semantic Model only for:

- the ordered KPI tab list;
- the visible tab labels;
- the selected KPI label in the Region chart title.

The Region KPI chart/list and organization filter have since moved to the
Semantic Model. Risk calculations and employee details continue to use the
existing Team source through the shared-filter legacy adapter. The current
organization contract is documented in
`docs/organization-filter-source-of-truth.md`.

## Semantic contract

The registered connection is `unimeModel`. The source table and columns are:

| Semantic source | Runtime alias | Meaning |
| --- | --- | --- |
| `'KPIname'[KPI]` | `kpiname` | display label |
| `'KPIname'[num]` | `kpi_id` | numeric identity and sort key |

`src/queries/dim-kpi.dax` is the checked-in query:

```dax
EVALUATE
SELECTCOLUMNS(
    'KPIname',
    "kpiname", 'KPIname'[KPI],
    "kpi_id", 'KPIname'[num]
)
```

`src/queries/dim-kpi.ts` is the frontend query wrapper. It returns
`connection`, `query` and `columnMetadata`. Metadata keys are the exact query
result names:

```text
[kpiname]
[kpi_id]
```

The wrapper is re-exported by `src/queries/index.ts`.

## Backend contract

`POST /api/dax/query` accepts:

```json
{
  "queryId": "dim-kpi",
  "params": {}
}
```

`params` is a strict empty object. The backend implementation is split
between:

- `backend/src/dax/dim-kpi.ts`: DAX builder;
- `backend/src/routes/dax.route.ts`: Zod request branch and registered-query
  switch;
- `src/lib/backend-semantic-model-client.ts`: frontend request type and
  expected columns `kpiname`, `kpi_id`.

The client converts backend object rows to the same row-major `QueryTable`
shape returned by the Fabric SDK, with column names `[kpiname]` and
`[kpi_id]`.

Because `dim-kpi` is a new backend query ID, the backend must be redeployed
before a production frontend configured with `VITE_DATA_SOURCE=backend` can
use it.

## Parsing and mapping

`src/feature/team/hooks/useTeamKpiDimension.ts` owns the query, parser and
mapping. It calls `useSemanticModelQuery` with both contracts:

- direct Fabric: `unimeModel` plus the checked-in DAX;
- backend mode: `{ queryId: "dim-kpi", params: {} }`.

The parser:

1. requires exact `[kpiname]` and `[kpi_id]` columns;
2. trims string labels;
3. accepts only finite integer JavaScript numbers for `kpi_id`;
4. discards blank labels, invalid IDs and unmapped IDs;
5. treats a repeated valid `kpi_id` as an integrity error and returns no
   partial list;
6. sorts valid items by `kpi_id` ascending.

The stable adapter to the current Team mock metric keys is:

| `kpi_id` | `TeamMetricKey` |
| ---: | --- |
| 1 | `calls` |
| 2 | `beat` |
| 3 | `time` |
| 4 | `osa` |
| 5 | `qc` |

There is no production fallback list. An ID outside this mapping cannot
drive the current mock calculations and is therefore invalid for this
screen.

The hook returns:

```ts
{
  kpis: TeamKpiDimensionItem[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}
```

## Rendering and failure isolation

`src/feature/team/pages/TeamPage.tsx` owns the hook call and passes its state
to `TeamKpiSection`.

`src/feature/team/components/overview/TeamKpiSection.tsx`:

- renders tabs from `kpis.map(...)`;
- uses `item.kpiId` as the React key;
- passes `item.key` to the existing Team metric selection state;
- renders `item.label` in the tab;
- uses the selected semantic label in `<label> theo khu vực`;
- never uses `TEAM_METRICS.map(...)` for this tab list.

Loading, query/parse error and empty states replace only the tab region.
Errors include a `Thử lại` button wired to the hook's `retry`. The chart and
list remain mounted with the existing Team mock state, so a `dim-kpi` failure
does not crash or blank the page. When no semantic label is available, the
chart uses the neutral title `KPI theo khu vực`; it does not synthesize a KPI
label or tab.

## Invariants

- Do not inline DAX in React or the query wrapper.
- Do not rename the exact result keys `[kpiname]` and `[kpi_id]`.
- Do not add a hardcoded/fake production tab fallback.
- Do not replace Team mock values, chart/list rows, risk or employee details
  with this dimension query.
- Do not use `TEAM_METRICS` to render the Team overview KPI tabs.
- Do not change Header, Date Navigator, Period Mode, Bottom Navigation,
  Team Details or `main#app` for this KPI-dimension integration.
- Do not add `!important` or a parallel V2 component.

## Verification

Co-located tests cover:

- query wrapper connection, DAX and exact metadata;
- backend schema, DAX builder and query dispatch;
- backend-client request and expected columns;
- invalid-row filtering, duplicate detection and ascending sort;
- the five-ID mapping;
- hook loading/error/retry behavior without fallback data;
- `TeamKpiSection` loading/error/retry and semantic chart label;
- `TeamPage` rendering a Semantic Model label.

Validation on 2026-07-29:

- `npx tsc -b --pretty false`: passed;
- targeted Vitest: 5 files / 24 tests passed;
- backend `npm run typecheck`: passed;
- backend `npm test`: 6 tests passed;
- backend `npm run build`: passed;
- `npm run lint`: passed;
- `npm run build`: passed with the existing bundle-size warning;
- `npm run test`: 31 files / 184 tests passed;
- live Fabric CLI query could not start because Azure CLI is not installed;
- authenticated Fabric portal embed loaded the nested
  `http://localhost:5173` app frame without an LNA block;
- deployed backend mode returned the expected pre-redeploy `dim-kpi` 400.
  The tab-region error remained isolated, retry issued another request, and
  chart, list and risk content remained visible;
- direct Fabric SDK mode returned the ordered live labels `Successful Calls`,
  `Tần suất viếng thăm`, `Time Spend`, `OSA`, `QC`;
- selecting `Successful Calls` updated `aria-selected`, the URL to
  `teamMetric=calls`, and the chart title to
  `Successful Calls theo khu vực`;
- the 430 px app frame had no horizontal overflow, all five 74 × 42 px tabs
  were visible without text overflow, and the chart/plot heights were
  286/216 px;
- the final KPI interaction produced no new app-frame console error. Existing
  mixed-content auto-upgrade warnings for shared image assets were observed
  during page navigation and are outside this KPI-dimension scope.
