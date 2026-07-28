# Overview page source of truth

## 1. Runtime source

- Page orchestration: `src/feature/overview/pages/OverviewPage.tsx`.
- MTD cycle query: `src/queries/dimdate.dax`.
- MTD cycle query contract: `src/queries/dim-date.ts`.
- MTD cycle data hook: `src/feature/overview/hooks/useDimDateData.ts`.
- Canonical period and selected-cycle state: `src/feature/overview/hooks/useOverviewPeriod.ts`.
- Feature Date Navigator: `src/feature/overview/components/DateNavigator.tsx`.
- Shared header: `src/components/dashboard-header/DashboardHeader.tsx`.
- Shared header presentation: `src/components/dashboard-header/dashboard-header.css`.
- Shared logo asset: `src/assets/unilever-logo.png`.
- Overview page, Date Navigator, sticky host, period and filter styles: `src/feature/overview/assets/styles/overview.css`.
- Shared frame: `src/components/AppShell.tsx`.

Overview imports the header only through the `src/components/dashboard-header/index.ts` barrel.

## 2. Runtime DOM and scroll ownership

```text
.overview-page
├── .app-shell
│   └── .app-shell__viewport.phone
│       ├── main#app.app-shell__scroll.app       ← only scroll owner
│       │   └── #memOverviewView
│       │       └── .overviewFullHeader
│       │           ├── .nwHeaderIdentityRow
│       │           │   ├── .nwHeaderBrand
│       │           │   ├── h1.nwHeaderTitle
│       │           │   └── button.nwHeaderLogoutBtn
│       │           └── .screenHeader
│       │               └── .toprow.nwHeaderControlsRow ← sticky trigger
│       │                   ├── .overviewFullHeaderDateSlot
│       │                   │   └── Overview DateNavigator slot
│       │                   └── .overviewFullHeaderFilterSlot
│       ├── BottomNavigation
│       └── Overview overlays
└── .overviewCompactHeaderHost                  ← outside #app and AppShell
    └── .overviewCompactHeader
        ├── .overviewCompactHeaderDate
        │   └── Overview DateNavigator slot
        └── button.headerFilterBtn
```

`body` and the document do not scroll. `#app` remains the sole scroll owner. The compact host intentionally remains a sibling of `AppShell`; it is aligned to `.phone` from measured geometry.

## 3. Sticky/freeze contract

The sticky implementation remains entirely in `OverviewPage.tsx`.

- `appScrollRef` points to `main#app` through `AppShell.contentRef`.
- `headerActionRowRef` is forwarded by `DashboardHeader` directly to `.screenHeader .toprow`.
- `compactHeaderHostRef` points to `.overviewCompactHeaderHost`.
- The only scroll listener is passive and attached to `#app`.
- A window resize listener and one `ResizeObserver` call the same updater.
- The observer watches `.phone`, `#app`, and the original action row.
- The compact header becomes active only when `#app.scrollTop > 0` and the original action row bottom is at or above `#app` top plus one pixel.
- `.phone.getBoundingClientRect()` is written to `--overview-sticky-left`, `--overview-sticky-top`, and `--overview-sticky-width` on the compact host.
- `.overviewCompactHeaderHost` remains `position: fixed` with `z-index: 180` in `overview.css`.
- Cleanup removes the same listeners, cancels the animation frame and disconnects the observer.

There is no sentinel, document scroll listener, second sticky header implementation or hard-coded phone offset.

## 4. Header and feature ownership

| Owner | Responsibilities |
| --- | --- |
| Shared Dashboard Header | Logo, title, logout, filter button and badge, full-header shell, compact-header shell, action-row ref forwarding, header visual/layout CSS and responsive rules. |
| OverviewPage | Compose dimdate, Overview KPI and filter hooks; merge loading/error/empty states and retry; pass the same navigator props to both headers; preserve sticky behavior, routes and overlays. |
| Overview DateNavigator | Previous/next controls and date label markup. Its `.mtd*` CSS remains in `overview.css`. |
| `useDimDateData` | Execute `dimDate()` once, validate all six fields, convert with `toDataTable`, sort rows by `cycleSort ASC`, and expose `cycles`, `loading`, `error` and `reload`. |
| `useOverviewPeriod` | Own canonical `period` and `selectedCycleKey`; derive the selected row, index, labels, bounds and Previous/Next transitions from sorted Semantic Model rows. |
| `useOverviewFilters` | Canonical applied/draft filters, badge count and filter-sheet lifecycle. |

The shared header does not import Overview types, formatters, components or Team files. It receives a feature-rendered `ReactNode` through `dateNavigator`.

## 5. State and callback flow

```text
src/queries/dimdate.dax
→ src/queries/dim-date.ts / dimDate()
→ Semantic Model connection "unimeModel"
→ useSemanticModelQuery
→ toDataTable
→ useDimDateData
→ sorted cycles
→ useOverviewPeriod(cycles)
→ selectedCycleKey + selectedCycle + labels + navigation callbacks
→ OverviewPage
→ identical DateNavigator props
→ DashboardHeader / DashboardCompactHeader slots

PeriodTabs
→ availability check
→ setPeriod only for enabled periods
→ useOverviewPeriod

useOverviewFilters
→ appliedFilterCount + openFilterSheet
→ shared full/compact Filter buttons
```

Full and compact headers render separate presentation nodes because they occupy different DOM locations, but both nodes receive the same `periodLabel`, `dateLabel`, `canGoPrevious`, `canGoNext`, `goToPreviousDate` and `goToNextDate` values through one shared props object. No period, cycle or filter state is copied into either header.

Today and 7 Ngày remain disabled. Clicking either tab shows
`Chức năng này chưa được triển khai` and does not change `period` or
`selectedCycleKey`. Previous/Next never changes the period away from MTD.

### MTD cycle contract and navigation

The Semantic Model is the only runtime owner of MTD cycle business logic.
`dimdate.dax` returns one precomputed row per cycle with exactly:

```text
cycleKey
cycleLabel
cycleStartDate
cycleEndDate
cycleSort
isLatestCycle
```

`dim-date.ts` maps the exact SDK output names
`[cycleKey]`, `[cycleLabel]`, `[cycleStartDate]`, `[cycleEndDate]`,
`[cycleSort]` and `[isLatestCycle]`. Cycle keys and sort values may be
numbers or strings; the hook preserves their validated runtime type.

`useDimDateData` does not synthesize or complete rows. A missing required
column or invalid row is an error, an empty successful table stays empty,
and query errors are propagated without a mock/default cycle.

`useOverviewPeriod(cycles)` keeps only `selectedCycleKey` as selected-cycle
state. It selects the row marked `isLatestCycle` by default and otherwise
falls back to the row with the largest `cycleSort`. When refreshed rows
still contain the selected key, the selection is preserved; otherwise it
resets to the latest row. Previous and Next select adjacent sorted rows.
Next cannot move beyond the Semantic Model latest row.

The navigator label is `MTD`. Its date label formats
`selectedCycle.cycleStartDate` and `selectedCycle.cycleEndDate` as
`dd/MM - dd/MM`; formatting is presentation-only. The frontend does not
derive a month boundary, latest date, start date or end date.

### Loading, error, empty and retry

Overview combines dimdate and KPI loading states so no default date is
shown while either required query is loading. A dimdate or KPI error uses
the existing Overview error state. The retry action reloads both dimdate
and Overview KPI data. A successful empty cycle table renders the existing
no-data state and no fake date. There is exactly one dimdate query hook.

### Team KPI MTD Semantic Model flow

The entire MTD “Tổng quan Đội ngũ” table uses one Semantic Model query:

```text
src/queries/kpimtd.dax
→ src/queries/kpimtd.ts
→ Semantic Model connection "unimeModel"
→ useKpiMtdData
→ useOverviewData
→ five Team KPI rows in Overview
```

`kpimtd.dax` multiplies the five model ratios by `100`, so TypeScript reads
already-scaled percentages without a `value <= 1` heuristic. The same row
also supplies all five Issued counts.

| Team row | Percent | Issued |
| --- | --- | --- |
| Successful Calls | `successfulCallsMtd` | `successfulCallsIssued` |
| Tần suất viếng thăm | `visitMtd` | `visitIssued` |
| Time Spend | `timeSpendMtd` | `timeSpendIssued` |
| OSA | `osaMtd` | `osaIssued` |
| QC | `qcMtd` | `qcIssued` |

For MTD, `useOverviewData` constructs the five Team rows from this result;
it does not read percent, Issued or trend from the static `teamKpis`.
Each row uses `issuedLabel: "NV"`, threshold `90` for `good`/`bad`, and an
empty trend because there is not yet a daily Semantic Model trend query.
The existing Sparkline empty-state is safe, and `KpiRow` falls back to KPI
status when no trend benchmark exists.

Market OSA uses the same `osaMtd` value from the shared result. No second
Semantic Model query is created. Loading, query error or any missing value
returns the existing loading/error/no-data state without a mock fallback.

Today and 7 Ngày retain their existing static data paths and remain
temporarily disabled. MTD remains enabled.

`useOverviewPeriod` exposes `selectedCycleKey` and `selectedCycle` for the
next integration phase. In the current phase they are not passed to
`kpiMtd()` or `useKpiMtdData`; KPI values therefore do not yet change when
the Date Navigator changes cycle.

## 6. CSS source of truth

- `src/components/dashboard-header/dashboard-header.css` owns full-header layout/visual styling, shared filter/badge styling, compact-header inner layout and header responsive rules for Overview and Team.
- `overview.css` owns only Overview page/shell/content styles, the `.overviewCompactHeaderHost` freeze integration, Overview Date Navigator internals, period tabs, data sections and Overview overlays.
- Overview Date Navigator selectors are `.mtdDateNav`, `.mtdNavBtn`, `.mtdDateText`, `.mtdLabel`, and `.mtdValue`.
- The full Date Navigator uses one contextual rule in `overview.css` to preserve its translucent surface while the compact navigator retains its existing surface.
- There is no `!important`, duplicate header block or cross-file header override.

Effective title sizes remain unchanged: `23px` by default, `22px` at widths up to `390px`, and `21px` at widths up to `360px`.

## 7. Invariants

- Keep exactly one scroll owner: `#app`.
- Keep `.screenHeader .toprow` as the original sticky trigger.
- Keep `.overviewCompactHeaderHost` outside `#app` and preserve its fixed position, CSS variables and z-index.
- Compact Overview header contains only the feature Date Navigator and shared Filter button; it does not contain logo, title or logout.
- Do not duplicate period, selected-cycle or filter state.
- Keep `dimdate.dax` as the only runtime source of MTD cycles, latest-cycle selection and cycle start/end dates.
- Do not restore `DEFAULT_REPORT_DATE`, `monthOffset`, a month cursor, month arithmetic, system-date inference or a mock/default cycle.
- Keep `selectedCycleKey` available for KPI filtering without applying it to `kpimtd` in this phase.
- Do not add a sentinel, document scroll listener or second sticky implementation.
- Do not use `!important`.
- Bottom Navigation stays outside `#app` and inside `.phone`.
- Filter Sheet stays above compact header and Bottom Navigation.

## 8. Refactor cleanup record

- Removed the root `src/components/DashboardHeader.tsx` implementation.
- Added the `src/components/dashboard-header/` component, CSS and barrel.
- Removed the header-owned `HeaderDateNavigator` and all date-specific props/callbacks from the shared API.
- Connected the existing Overview `DateNavigator` to full and compact slots.
- Removed full/compact header presentation CSS from `overview.css`; retained only feature Date Navigator and freeze-host CSS.
- The Unilever logo has one runtime source at `src/assets/unilever-logo.png`; no feature-local logo remains.
- Replaced the temporary `DEFAULT_REPORT_DATE`/month-cursor runtime with the
  Semantic Model dimdate flow.
- Removed frontend month-boundary and month-navigation calculations; cycle
  selection now moves only across sorted model rows.

## 9. Validation checklist

- At 430px, 390px and 360px, full Date Navigator and Filter must not overlap or overflow.
- At the top, compact header is hidden.
- After the original action row crosses the `#app` top edge, compact header is fixed and aligned with `.phone`.
- `window.scrollY` and document scroll remain zero during `#app` scrolling.
- Returning `#app` to zero hides compact header.
- On the latest cycle, the right button is absent; on an older cycle, it is present.
- Previous/Next selects the adjacent `cycleSort` row and cannot cross the available/latest bounds.
- Full and compact navigators receive the same label, date, bounds and callbacks.
- Loading does not show a default cycle; error retry reloads both required data flows; a successful empty cycle result renders no-data.
- Filter opens the Overview sheet; applying a filter updates both badge instances from the same count.
- Logout keeps its existing Overview behavior.
- Today and 7 Ngày show the unavailable toast without changing the selected cycle; MTD remains selected.
- Build, lint and unit tests must pass.



<!-- OVERVIEW_TYPOGRAPHY_SCALE_START -->

## Overview typography weight scale

Overview content uses exactly four font-weight levels:

- `400` — descriptions and supporting copy.
- `560` — labels, table headers and secondary navigation.
- `640` — card titles, row titles, badges and controls.
- `760` — primary KPI values, section titles and key emphasis.

The main coverage percentages use `760`, reduced from the previous `820`.

The shared Dashboard Header remains shared, but its `.overview-page` title,
cycle label and filter badge are mapped to the same four-level hierarchy.
Team-specific shared-header selectors are unchanged.

<!-- OVERVIEW_TYPOGRAPHY_SCALE_END -->


<!-- OVERVIEW_PERIOD_AVAILABILITY_START -->

## Temporary period availability

Current Overview period availability:

- Today: disabled
- 7 Days: disabled
- MTD: enabled

Today and 7 Days content/data remain in the source. Clicking either
disabled tab shows the existing toast:

`Chức năng này chưa được triển khai`

The UI remains on MTD. Previous-date navigation also remains on MTD
while Today is disabled.

Source of truth:

`src/feature/overview/lib/constants.ts`

To re-enable a period, change its value in
`OVERVIEW_PERIOD_AVAILABILITY` from `false` to `true`.

<!-- OVERVIEW_PERIOD_AVAILABILITY_END -->

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

<!-- OVERVIEW_FILTER_FE_START -->

## Temporary Overview filter frontend

The Overview Filter Sheet currently contains three frontend fields:

- Khu vực
- AMM
- Supervisor

The previous Kênh and Nhà phân phối fields were removed.

`useOverviewFilters` owns separate draft and applied values. Opening the
sheet copies applied values into the draft. Closing without applying
restores the applied values.

`Xóa lọc` resets only the current draft to `all` and keeps the sheet open.
`Áp dụng bộ lọc` commits the draft, updates the shared header badge and
closes the sheet.

The current option lists contain only their `Tất cả` entries. This phase
does not query Semantic Model dimensions and does not pass these filters
into KPI summary or trend queries.

<!-- OVERVIEW_FILTER_FE_END -->

