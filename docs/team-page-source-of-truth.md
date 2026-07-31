# Team page source of truth

## Runtime source and routes

The Team KPI overview chart and table are backed by the Power BI Semantic
Model. The column chart always uses Region data from `dim-region`. The tabs
below the chart switch only the table: Region uses `dim-region`; AMM uses
`dim-amm`. Both entity sources use the existing `overview-kpi-summary`
contract.

The remaining Team Risk, employee details and four Team Details tabs
(`Rớt chuỗi nhiều ngày`, `Rớt nhiều KPI`, `Xem theo Quản lý`, `Theo NPP`)
remain backed by the exact user-provided dataset migrated to
`src/feature/team/data/team.raw.json`. The `Xem theo KPI` tab is excluded from
that legacy boundary and is documented below.

- 1,800 daily rows.
- 180 unique employees.
- 10 report dates from 2026-06-01 through 2026-06-10.
- Five metrics: Calls, Beat, Time Spend, OSA and QC.
- Risk threshold: strictly below 90%.

`src/feature/team/queries/team.queries.ts` is the read-only boundary for
those remaining legacy sections. It is not the source for KPI overview
Region or AMM entities. No backup file is imported into the runtime graph.

The History API router in `src/App.tsx` owns these routes:

```text
/                 OverviewPage
/team             TeamPage
/team/details     TeamDetails
```

`TeamProvider` wraps the route switch, so Team overview and detail views use
one in-memory state instance. URL params make the report context restorable
after direct navigation or refresh.

## Shared component ownership

Overview and Team use the same runtime implementations:

| Concern | Source of truth |
| --- | --- |
| Header | `src/components/dashboard-header/DashboardHeader.tsx` |
| Date Navigator | `src/components/dashboard-header/DateNavigator.tsx` |
| Filter Trigger | `src/components/dashboard-header/HeaderFilterTrigger.tsx` |
| Organization Filter | `src/components/organization-filter` |
| Period Mode | `src/components/report-period/ReportPeriodMode.tsx` |
| Bottom Navigation | `src/components/BottomNavigation.tsx` |

The Header receives data/callback props only. It owns logo, title, the
always-present optional cycle slot, Back control, shared Date Navigator and
shared Filter Trigger. Overview enables its separate compact-header host;
Team opts into the shared full-header sticky modifier.

Team passes:

- title `Đội ngũ`;
- `TEAM_DATA.meta.cycle` as the visible cycle;
- Team report context to Date Navigator;
- Team filter count/open callback;
- Back to Overview.

Overview passes the same DOM contract but leaves the cycle slot semantically
empty. There is no Overview-specific alignment rule.

The Header opens the shared Region → AMM → Supervisor sheet. Overview and
Team use one provider, one encoded applied/draft state and one semantic
option query implementation. See
`docs/organization-filter-source-of-truth.md`.

## Shared period contract

The only report-period type is:

```ts
type ReportPeriod = "today" | "7days" | "mtd";
```

It is owned by `src/lib/report-period.ts`, together with pure utilities for:

- period labels;
- Today, seven-calendar-day and month-to-date ranges;
- range formatting;
- available-date selection;
- previous/next date lookup;
- boundary clamping;
- legacy `seven-days` URL normalization.

`src/hooks/use-report-period.ts` is the shared state contract. Both the
Overview semantic-cycle adapter and TeamProvider use it.

Period meaning:

| Mode | Range |
| --- | --- |
| Today | anchor date only |
| 7 Ngày | anchor minus six calendar days through anchor |
| MTD | first calendar day of the anchor month through anchor |

Date Navigator changes the anchor by one available report date. Period Mode
changes the range and aggregation without changing the anchor.

Overview keeps its verified availability rule: MTD is enabled; Today and
7 Ngày still show the existing unavailable-feature message. A disabled
Overview URL period is normalized back to MTD. Moving to an older Overview
cycle does not auto-switch period.

## Team report state

`TeamProvider` in `src/feature/team/hooks/useTeamState.tsx` owns:

- `period`;
- `reportDate` / anchor and available-date index;
- selected report dates and formatted range;
- previous/next bounds and callbacks;
- selected Team KPI, table entity level and selected Region chart entity;
- employee-sheet context.

Organization state is not owned by `TeamProvider`. It consumes shared applied
state only to derive the documented adapter for the remaining legacy Team
sections.

TeamPage renders Period Mode directly below Header and above the KPI
overview. Semantic query rows feed:

- Region rows always feed the column chart and employee-count badge;
- Region rows feed the table when the Region tab is active;
- AMM rows feed only the table when the AMM tab is active.

The local `currentRows` view model feeds only:

- risk histogram and groups;
- top KPI/SUP/NPP cards;
- the four not-yet-migrated TeamDetails panels: streak, multi-KPI, manager
  and NPP.

The remaining local sections are synchronous. The semantic KPI overview has
isolated loading, error and retry states and never falls back to local rows.

## TeamDetails / Xem theo KPI employee source

`TeamDetails` tab `Xem theo KPI` uses one employee-grain Semantic Model query:

```text
dim-kpi (KPI identity and label)
  + dimnv employee identity
  + [Actual KPI Selected]
  + [Target KPI Selected]
  + [MTD KPI Selected]
  → team-employee-kpi
  → useTeamEmployeeKpiData
  → TeamByKpiPanel
```

The query returns all matching employees in one table. It does not execute
`kpimtd` once per employee and it does not query employee `nvFail` or status.
The exact output aliases are:

```text
employeeId, employeeLabel, regionId, ammId, supervisorId,
actual, target, percentage
```

Employee identity comes from `dimnv`; KPI identity and the selector label come
from `dim-kpi`. Every request contains the selected `cycleKey`, `kpiId` and
the exact encoded `region`, `amm`, and `supervisor` filters. Region and AMM
route drill-down values are IDs, not display labels, and are passed unchanged
to the DAX `TREATAS` filters.

The frontend derives employee status only from Semantic `percentage` with the
strict 90% threshold:

```text
percentage < 0.9  → fail
percentage >= 0.9 → pass
percentage BLANK  → no-data
```

`actual`, `target`, and `percentage` are displayed from their Semantic measure
outputs; the frontend does not recalculate `percentage` from actual/target.
Only `fail` rows are listed, sorted by percentage, employee label, then
employee ID. Loading, query/schema error with retry, and empty-result states
are isolated to the panel. There is no fallback to `team.raw.json`,
`team.currentRows`, or any hardcoded employee list. The row is intentionally
non-interactive in this migration phase because the existing employee detail
sheet still reads legacy data and would show an incorrect employee/KPI source.

This migration does **not** apply to `Rớt chuỗi nhiều ngày`, `Rớt nhiều KPI`,
`Xem theo Quản lý`, or `Theo NPP`; those tabs retain the legacy source until a
Semantic query with their required grain is implemented.

## Team KPI tab dimension

The Team overview KPI tabs are sourced from the Power BI Semantic Model. The
runtime ownership chain is:

```text
'KPIname'[KPI], 'KPIname'[num]
→ src/queries/dim-kpi.dax
→ src/queries/dim-kpi.ts
→ direct Fabric query or backend queryId "dim-kpi"
→ useTeamKpiDimension
→ TeamPage
→ TeamKpiSection tabs and Region chart title
```

The query aliases are `kpiname` and `kpi_id`; the frontend receives exact
column names `[kpiname]` and `[kpi_id]`. Valid IDs are sorted ascending and
adapted to the existing Team state:

```text
1 → calls
2 → beat
3 → time
4 → osa
5 → qc
```

Blank/invalid/unmapped rows are ignored. A duplicate valid `kpi_id` is an
integrity error, not a de-duplication rule. Loading, error/retry and empty
states are isolated to the tab region. There is no hardcoded production tab
fallback.

The selected `TeamMetricKey` resolves the Semantic `kpiId` used by both the
Region and AMM KPI requests. It continues to drive the remaining local risk
views and employee details. The full dimension contract is in
`docs/team-kpi-dimension-semantic-source-of-truth.md`.

## Team KPI entity sources

The entity data flow is:

```text
Chart, badge and Region table:
  dim-region → one overview-kpi-summary request per visible Region

AMM table while the AMM tab is active:
  dim-amm → one overview-kpi-summary request per visible AMM
```

Both paths reuse `src/queries/kpimtd.ts` and backend queryId
`overview-kpi-summary`; no Team-specific KPI DAX query exists. Every request
contains `cycleKey`, `kpiId`, `region`, `amm` and `supervisor`.

`TeamPage` keeps the Region source enabled because the chart and badge never
change with the table tab. The AMM source is enabled only while the AMM tab
is active. Switching tabs preserves the cycle, KPI, selected Region chart
entity and shared applied Region/AMM/Supervisor filters.

Chart and table state are intentionally independent:

- the chart uses Region rows, loading, error and retry only;
- the employee-count badge uses the Region total only;
- the Region table uses Region rows, loading, error and retry;
- the AMM table uses AMM rows, loading, error and retry;
- AMM loading or failure never blanks or replaces a successful Region chart;
- Region chart failure does not prevent a successful AMM table from
  rendering.

The shared applied Region/AMM/Supervisor filters still feed both sources.
A selected AMM or Supervisor therefore changes the Region aggregates shown
in the chart as well as the applicable AMM table queries.

AMM identity comes only from `[ammId]` returned by `dim-amm`.
`encodeDimensionValue(ammId)` produces the query/filter identity; the
Semantic `[ammLabel]` is display-only. `[regionId]` is also encoded and is
used for the per-AMM Region request when the shared Region filter is `all`.
Duplicate AMM IDs are an integrity error. Invalid IDs or labels are omitted.
No Team mock AMM option list or legacy hierarchy row is used by the KPI
overview.

AMM requests are dynamic rather than fixed to four slots. The hook renders
one keyed query-item component per visible AMM; each item owns one stable
query hook. A collection generation includes cycle, KPI, all shared filters
and the visible AMM IDs, so stale responses from a previous generation are
not aggregated.

After all visible entity rows resolve, the frontend normalizes:

```text
contributionNv     = countNv / sum(visible countNv)
contributionNvFail = nvFail / sum(visible nvFail)
```

The same normalization applies to Region and AMM without changing the
existing Region results. A single positive visible entity has contribution
`1`; a zero total or null numerator produces `null`. The chart always renders
normalized Region rows. The table renders normalized Region or AMM rows
according to the selected table tab.

## Team period aggregation

The aggregation pipeline is:

```text
available daily rows
→ select Today / 7 Ngày / MTD dates
→ apply Team hierarchy filters
→ group by unique empCode
→ sum actual and target for each metric
→ percentage = aggregate actual / aggregate target
→ classify employee risk from recalculated percentages
→ aggregate the remaining local risk/detail views
```

`aggregateTeamEmployeeRows()` creates exactly one row per employee. The
latest row in the range supplies descriptive hierarchy fields; metric
actual/target values are summed. A non-positive target produces `null`.

Entity percentages also use the group's aggregate actual divided by aggregate
target. They are not averages of daily percentages. Headcount, fail count and
risk groups therefore count an employee once per report range.

Risk logic:

- each employee's five period percentages are compared with 90%;
- 0 failed metrics → safe;
- 1–2 → watch;
- 3–5 → high;
- histogram/top KPI/SUP use those aggregate employee rows;
- the separate “consecutive-day streak” insight intentionally continues to
  scan daily history ending at the same anchor date.

The migrated source's daily percentage fields are not numerically equal to
`actual / target` for every metric, especially Time Spend. No verified
alternative multi-day business formula exists in the project. The period
implementation therefore follows the required aggregate-actual/target
contract explicitly rather than averaging those daily percentages.

## URL and navigation state

Canonical Team report params:

```text
period=today|7days|mtd
date=YYYY-MM-DD
region=<value>
amm=<value>
supervisor=<encoded-id|all>
teamMetric=calls|beat|time|osa|qc
level=region|amm
entity=<selected-entity-encoded-id>
```

TeamDetails adds:

```text
tab=by-kpi|streak|multi|manager|npp
metric=<metric>
group=high|watch|safe
```

`TeamProvider.createRouteSearchParams()` is the only serializer.
`hydrateFromSearchParams()` is the corresponding adapter. TeamDetails tab
changes start from the canonical params and never discard period/date/filter
context.

Back behavior:

- Team Header → Overview, carrying period/date. Overview applies its own
  availability and semantic-cycle boundaries.
- TeamPage → TeamDetails carries period/date/filters and selected overview
  state.
- TeamDetails → TeamPage restores the same context.
- Overview Header Back remains a local toast:
  `Landing chưa được triển khai`.

## App Shell, scrolling and overlays

```text
.app-shell
└── .app-shell__viewport.phone
    ├── main#app.app-shell__scroll.app   ← only content scroll owner
    ├── shared BottomNavigation
    └── feature overlays
```

Header and Period Mode are inside the content scroll. Bottom Navigation, the
shared Organization Filter Sheet and Employee Sheet remain siblings outside
it. No nested page scroll was introduced.

## CSS source of truth

- global tokens, App Shell and Bottom Navigation:
  `src/global.css`;
- Header, Date Navigator and Filter Trigger:
  `src/components/dashboard-header/dashboard-header.css`;
- Period Mode:
  `src/components/report-period/report-period-mode.css`;
- Organization Filter:
  `src/components/organization-filter/organization-filter.css`;
- Team-only cards, chart, lists and sheets:
  `src/feature/team/assets/styles/team.css`;
- TeamDetails-only panels:
  `src/feature/team/assets/styles/team-details.css`.

Feature CSS contains no selectors for the shared Header, Date Navigator,
Filter Trigger, Period Mode or Bottom Navigation. There is no `!important`
override.

## Removed legacy implementations

- `src/feature/overview/components/DateNavigator.tsx`;
- `src/feature/team/components/DateNavigator.tsx`;
- `src/feature/overview/components/PeriodTabs.tsx`;
- `src/feature/overview/components/FilterSheet.tsx`;
- `src/feature/overview/hooks/useOverviewFilters.ts`;
- `src/feature/overview/hooks/useOverviewFilterOptions.ts`;
- `src/feature/team/components/filters/TeamFilterSheet.tsx`;
- their feature-owned `.mtd*`, `.overviewPeriodBelow`,
  `.memv2-period-btn` and orphan `.memv2-nav-btn` CSS.

The old brief path `src/components/DashboardHeader.tsx` does not exist. The
actual shared Header path is `src/components/dashboard-header/DashboardHeader.tsx`.

## Automated verification

The co-located test suite covers:

- Today, seven-day and MTD ranges/labels/navigation/bounds;
- shared Header/Date Navigator/Period Mode/Bottom Navigation contracts;
- Overview Back toast and unavailable periods;
- Team Today/7-day/MTD aggregation;
- aggregate actual/target recalculation;
- unique employee count;
- period + hierarchy filter;
- aggregate risk classification;
- TeamPage period-driven Header/chart/list/risk updates;
- TeamPage → TeamDetails and TeamDetails → Team context preservation.
- Team KPI query wrapper, backend registration and expected columns;
- Team KPI parse/sort/duplicate rules and ID-to-mock-key mapping;
- isolated KPI tab loading/error/retry behavior;
- TeamPage Semantic Model tab and chart labels;
- AMM dimension parsing, invalid-row rejection and duplicate-ID rejection;
- exact encoded Region/AMM matching and Supervisor request propagation;
- dynamic AMM query collections with more than four AMMs;
- AMM frontend contribution normalization, including zero and single-row
  totals;
- permanent Region chart/badge ownership and level-specific table ownership;
- independent chart/table loading, error and retry behavior.

Verification completed on 2026-07-30:

- `npx tsc -b --pretty false`: passed;
- targeted Team Vitest: 4 files / 27 tests passed;
- `npm run lint`: passed;
- `npm test`: passed, 30 files / 186 tests;
- `npm run build`: passed; Vite emitted the existing chunk-size warning;
- authenticated Fabric portal embed loaded the nested app frame;
- direct Fabric mode rendered four live Regions and ten live AMMs; all AMMs
  beyond the fourth were retained;
- switching the table from Region to AMM kept the chart title, four Region
  names, four Region values and the 1,351-employee Region badge unchanged;
- only the table changed, from four Region rows to ten live AMM rows;
- selecting Region `number:1`, AMM `number:8214` and Supervisor `number:8227`
  produced one visible AMM with 8 employees and both contributions at 100%;
- the 350, 360, 390 and 430 px app surfaces had no horizontal page overflow;
  long AMM table labels use the existing row ellipsis;
- level tabs remained 42 px high, and `main#app` remained the vertical scroll
  owner;
- no console error originated from the localhost app. The two recorded
  resource errors came from Fabric/Power BI hosts; existing mixed-content
  auto-upgrade warnings for shared image assets remain outside this change.

<!-- TEAM_REGION_KPI_EXISTING_QUERY_START -->

## Team Region KPI using the existing kpimtd query

The Team Region chart and Region table use `dim-region` plus the existing
one-row `kpimtd` query. The full contract is documented in:

```text
docs/team-region-kpi-semantic-source-of-truth.md
```

No separate Team Region KPI DAX/TS query exists.

<!-- TEAM_REGION_KPI_EXISTING_QUERY_END -->
