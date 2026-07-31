# Overview KPI Semantic Model source of truth

## 1. Current query files

- `src/queries/kpimtd.dax` returns one MTD row containing five KPI
  percentages and five Issued counts.
- `src/queries/kpimtd.ts` owns the `unimeModel` connection alias,
  `KpiMtdRow`, the DAX import and exact query-column metadata.
- `src/queries/dimdate.dax` and `src/queries/dim-date.ts` independently
  supply the precomputed MTD cycles used by the Date Navigator.
- `src/queries/index.ts` exports both query modules.

The deleted `osamtd.ts` / `osamtd.dax` module is not used.

## 2. Connection

The query factory uses the Semantic Model connection `unimeModel`.
`fabric.yaml` and generated `src/fabric.generated.ts` provide its current
Fabric workspace and item identifiers at runtime.

## 3. `kpimtd.dax` output contract

The query returns these ten columns:

| Output column | DAX expression | Runtime meaning |
| --- | --- | --- |
| `successfulCallsMtd` | `[mtd_call] * 100` | Successful Calls percent |
| `successfulCallsIssued` | `[nvfail_call]` | Successful Calls Issued |
| `visitMtd` | `[mtd_visit] * 100` | Visit percent |
| `visitIssued` | `[nvfail_visit]` | Visit Issued |
| `timeSpendMtd` | `[mtd_timespend] * 100` | Time Spend percent |
| `timeSpendIssued` | `[nvfail_timespend]` | Time Spend Issued |
| `osaMtd` | `[mtd_osa] * 100` | OSA percent |
| `osaIssued` | `[nvfail_osa]` | OSA Issued |
| `qcMtd` | `[mtd_qc] * 100` | QC percent |
| `qcIssued` | `[nvfail_qc]` | QC Issued |

Scaling belongs to DAX. TypeScript does not use a
`value <= 1 ? value * 100 : value` heuristic.

The factory metadata remains keyed by the exact SDK column names such as
`"[successfulCallsMtd]"` and `"[osaMtd]"`, and maps them to the cleaned
names in `KpiMtdRow`.

## 4. Data flow

```text
kpimtd.dax
→ kpimtd.ts / kpiMtd()
→ useSemanticModelQuery
→ Semantic Model connection "unimeModel"
→ toDataTable(queryTable, columnMetadata)
→ useKpiMtdData
→ useOverviewData
→ OverviewPage
→ Team KpiTable / KpiRow
```

`useKpiMtdData` is the shared runtime owner. It calls
`useSemanticModelQuery` once, converts the result once and reads all ten
required fields from the first row.

### Date Navigator boundary

The MTD Date Navigator now has a separate Semantic Model flow:

```text
dimdate.dax
→ dim-date.ts / dimDate()
→ Semantic Model connection "unimeModel"
→ useDimDateData
→ useOverviewPeriod(cycles)
→ selectedCycleKey + selectedCycle
→ OverviewPage
→ full and compact DateNavigator
```

The frontend chooses existing rows by `cycleSort`; latest comes from
`isLatestCycle`, and displayed start/end dates come directly from the
selected row. There is no frontend month arithmetic, system-date
inference, `DEFAULT_REPORT_DATE` or mock-cycle fallback.

This flow does not currently modify the KPI query. `selectedCycleKey` and
`selectedCycle` are exposed by `useOverviewPeriod`, but neither is passed
to `kpiMtd()` or `useKpiMtdData` in this phase.

## 5. Team KPI mapping

For `period === "mtd"`, `useOverviewData` replaces the complete
`teamKpis` array:

| ID | Title | Percent | Issued |
| --- | --- | --- | --- |
| `successful-calls` | Successful Calls | `successfulCallsMtd` | `successfulCallsIssued` |
| `beat` | Tần suất viếng thăm | `visitMtd` | `visitIssued` |
| `time` | Time Spend | `timeSpendMtd` | `timeSpendIssued` |
| `team-osa` | OSA | `osaMtd` | `osaIssued` |
| `qc` | QC | `qcMtd` | `qcIssued` |

Every row uses:

- `issuedLabel: "NV"`;
- `status: "good"` when percent is at least `90`, otherwise `"bad"`;
- `trend: []`.

Percent, Issued and trend are not copied from `base.teamKpis`.

Market OSA receives the same `values.osaMtd` from this result. It does not
create another query.

## 6. Acceptance scaling

Because DAX performs the multiplication:

- raw `[mtd_call] = 0.93` returns `successfulCallsMtd = 93` and renders
  `93.0%`;
- raw `[mtd_osa] = 0.95` returns `osaMtd = 95` and renders `95.0%`;
- raw `[mtd_qc] = 0.99` returns `qcMtd = 99` and renders `99.0%`;
- raw `[mtd_timespend] = 1.02` returns `timeSpendMtd = 102` and renders
  `102.0%`;
- raw `[mtd_visit] = 0.0027` returns `visitMtd = 0.27`; the current
  one-decimal formatter renders `0.3%`.

Issued values are read unchanged from their Semantic Model columns.

## 7. Hook and component ownership

| Owner | Responsibility |
| --- | --- |
| `kpimtd.dax` | Compute percentage scale and return the ten-field MTD row. |
| `kpimtd.ts` | Connection, DAX import, row type and exact column metadata. |
| `useSemanticModelQuery` | Execute through the Fabric SDK and expose result/loading/error/refetch. |
| `toDataTable` | Apply cleaned metadata to the SDK table. |
| `useKpiMtdData` | Validate and return all ten numeric values atomically. |
| `useOsaMtdData` | Compatibility adapter for legacy OSA-only callers; Overview does not use it. |
| `useOverviewData` | Construct all five MTD Team rows and update Market OSA from the one shared result. |
| `useDimDateData` | Independently validate and expose the sorted MTD cycle rows for navigation. |
| `useOverviewPeriod` | Own `selectedCycleKey` and expose the selected Semantic Model row without filtering KPI data yet. |
| `KpiRow` / `Sparkline` | Render the percent, Issued count and safe empty-trend state. |

## 8. Loading, error and missing-data behavior

- Loading returns `values: null` and propagates the loading state.
- SDK result errors and network-level errors propagate their messages.
- A missing row, missing column, null value or non-finite value invalidates
  the complete ten-field result.
- Invalid or incomplete success responses return
  `Semantic Model không trả đủ dữ liệu KPI MTD`.
- MTD Overview returns no KPI data while loading or errored; it never
  exposes partial Semantic data or static Team fallback values.
- `refetch` is passed through unchanged.
- Overview combines KPI and dimdate loading/error state. Its retry action
  reloads both data flows.
- A successful empty dimdate table renders the Overview no-data state;
  query or validation errors do not fall back to a default/mock cycle.

## 9. Mock-data boundary

For MTD, the static `teamKpis` array still exists in
`overview-period.data.ts` for compatibility, but runtime does not read its
percent, Issued or trend fields. The old MTD Team values such as `99.8`,
`97.9`, `88.5` and `98.3` therefore cannot enter the rendered Team table.

Static data still supplies:

- coverage;
- non-OSA Market KPIs;
- Market KPI Issued/status/trend;
- Today and 7 Ngày data.

Today and 7 Ngày remain disabled and otherwise unchanged.

## 10. Trend limitation

`kpimtd.dax` has no daily trend grain. MTD Team rows therefore use an
empty trend instead of mock points. `Sparkline` already renders an empty
SVG safely. When no benchmark is available, `KpiRow` uses the row status
derived from the threshold of `90`.

A future trend requires a separately validated daily-grain DAX query; it
must not be synthesized from the current one-row result.

## 11. Adding another Semantic Model KPI

1. Confirm the source model and measure.
2. Validate the DAX query against the registered connection.
3. Keep semantic calculations and scale in DAX.
4. Copy exact CLI output names into `columnMetadata`.
5. Extend the typed row and shared hook atomically.
6. Reject partial results instead of mixing Semantic and mock fields.
7. Reuse one shared query result for multiple consumers.
8. Add focused query, hook and mapping tests.
9. Run build, lint, unit tests and Fabric portal embed validation.

## 12. Current implementation source files

- `src/queries/kpimtd.dax`
- `src/queries/kpimtd.ts`
- `src/queries/dimdate.dax`
- `src/queries/dim-date.ts`
- `src/queries/index.ts`
- `src/feature/overview/hooks/useDimDateData.ts`
- `src/feature/overview/hooks/useOverviewPeriod.ts`
- `src/feature/overview/hooks/useKpiMtdData.ts`
- `src/feature/overview/hooks/useOsaMtdData.ts`
- `src/feature/overview/hooks/useOverviewData.ts`
- `src/feature/overview/hooks/index.ts`
- `src/feature/overview/components/KpiRow.tsx`
- `src/feature/overview/pages/OverviewPage.tsx`
- `src/queries/kpimtd.spec.ts`
- `src/queries/dim-date.spec.ts`
- `src/feature/overview/hooks/useDimDateData.spec.ts`
- `src/feature/overview/hooks/useOverviewPeriod.spec.ts`
- `src/feature/overview/hooks/useKpiMtdData.spec.ts`
- `src/feature/overview/hooks/useOsaMtdData.spec.ts`
- `src/feature/overview/hooks/useOverviewData.spec.ts`
- `src/feature/overview/components/KpiRow.spec.tsx`
- `src/components/dashboard-header/DateNavigator.spec.tsx`
- `src/feature/overview/pages/OverviewPage.spec.tsx`
- `src/feature/overview/lib/formatters.spec.ts`
- `docs/overview-kpi-semantic-model-source-of-truth.md`
- `docs/overview-page-source-of-truth.md`

## 13. Validation and remaining limitations

The current implementation must be validated with:

```text
npm run build
npm run lint
npm run test
npx tsc -b --pretty false
```

Final pass/fail results and test counts belong in the completion report
after the current validation run; this document does not preserve counts
from an older source snapshot.

`selectedCycleKey` and the shared encoded Region, AMM and Supervisor filters
are applied to `kpimtd.dax` and its backend request. Changing the Date
Navigator or applying an organization filter therefore rebuilds the semantic
query context. The shared filter ownership and cascade are documented in
`docs/organization-filter-source-of-truth.md`.

<!-- OVERVIEW_KPI_CYCLE_FILTER_START -->

## KPI MTD cycle filter

The MTD Team KPI query remains a single-row query. The active Date
Navigator cycle is passed as `selectedCycleKey` through this runtime path:

```text
useOverviewPeriod
→ selectedCycleKey
→ OverviewPage
→ useOverviewData({ period, cycleKey })
→ useKpiMtdData(cycleKey)
→ kpiMtd({ cycleKey })
→ TREATAS({ cycleKey }, Date[Chu kỳ KPI Key])
→ Semantic Model measures
→ one KPI result row
```

The frontend does not calculate cycle dates or KPI values. It only sends
the Semantic Model cycle key as filter context. Changing Previous/Next
changes the query string, causing the five Team KPI percentages and five
Issued counts to be queried again for the selected cycle.

No MTD Team mock fallback is used when the cycle query is loading,
errored or incomplete.

<!-- OVERVIEW_KPI_CYCLE_FILTER_END -->

<!-- OVERVIEW_TEAM_KPI_TREND_START -->

## Team KPI MTD Semantic Model trend

Team KPI summary and Team KPI trend are independent queries:

```text
selectedCycleKey
├── kpimtd.dax
│   └── one row: five KPI percentages + five Issued counts
└── kpimtd-trend.dax
    └── daily rows: Date + five MTD KPI values + benchmark
```

`kpimtd.dax` and its existing runtime contract are unchanged.

`kpimtd-trend.dax` applies the same
`Date[Chu kỳ KPI Key]` filter and evaluates the five MTD measures at each
date in the selected cycle. All five trend series use benchmark `90`.

The frontend does not calculate KPI values or cycle dates. It validates
the query result and maps each daily row to the existing `TrendPoint`
contract used by `Sparkline`.

Trend query loading, error or an empty successful result does not hide
valid summary percentages and Issued counts. In those cases, Sparkline is
empty and no mock trend is shown.

<!-- OVERVIEW_TEAM_KPI_TREND_END -->
