# Organization filter source of truth

Updated: 29/07/2026

## Ownership

The only runtime implementation of the Region → AMM → Supervisor filter is:

```text
src/components/organization-filter/
├── OrganizationFilterProvider.tsx
├── OrganizationFilterSheet.tsx
├── useOrganizationFilters.ts
├── useOrganizationFilterOptions.ts
├── organization-filter.types.ts
├── organization-filter.constants.ts
├── organization-filter.css
└── index.ts
```

`OrganizationFilterProvider` is mounted once in `src/App.tsx`, above the
Overview/Team route switch. Page unmounts therefore do not reset applied
organization state. Each active page mounts the same
`OrganizationFilterSheet` inside its own `AppShell.overlays` slot so the
sheet remains an absolute sibling of `main#app` and does not change the
scroll owner, bottom navigation or Header geometry.

The existing shared `DashboardHeader` remains the only Filter Trigger. Both
the full and compact Overview Header and the Team Header read
`appliedFilterCount` and `openFilterSheet` from the same provider.

## UI contract

The shared sheet is the moved Overview implementation. It preserves the
Overview source-of-truth dimensions, colors, typography, overlay, spacing,
button copy and interaction behavior:

- fields: `Khu vực`, `AMM`, `Supervisor`;
- actions: `Xóa lọc`, `Áp dụng bộ lọc`;
- backdrop mouse-down and the close button close the sheet;
- sheet interaction does not close or click through the backdrop;
- per-level loading disables only that select;
- semantic option failure shows
  `Không thể tải đầy đủ danh sách bộ lọc.`;
- Clear changes draft only and keeps the sheet open;
- Apply changes applied state once and closes the sheet.

Presentation is owned only by
`src/components/organization-filter/organization-filter.css`. The former
Overview filter CSS and Team filter CSS are not runtime sources.

## State contract

The provider exposes:

```ts
{
  appliedFilters,
  appliedFilterLabels,
  draftFilters,
  isFilterOpen,
  appliedFilterCount,
  openFilterSheet,
  closeFilterSheet,
  updateDraftFilter,
  clearDraftFilters,
  applyFilters,
  regionOptions,
  ammOptions,
  supervisorOptions,
  // per-level loading and error state
}
```

Opening and closing clone applied state into draft. Draft changes never drive
Overview/Team data queries. Apply copies the complete draft into applied
state once. The label snapshot is updated with Apply and remains stable while
a different draft cascade is being explored, so legacy Team data underneath
the open sheet cannot react before Apply.

The hierarchy rules are:

```text
Region change     → AMM=all, Supervisor=all
AMM change        → Supervisor=all
Supervisor change → no parent change
```

Applied count is the number of the three primitives not equal to `all`.

## Encoded value contract

IDs, not labels, are filter identity:

```ts
type EncodedDimensionValue =
  | "all"
  | `number:${string}`
  | `string:${string}`;
```

`encodeDimensionValue` in `src/queries/org-filter.ts` is the only encoder.
`number:1`, `string:001` and `number:16365` preserve the original semantic
ID type. Labels are display-only except at the documented legacy Team
adapter boundary.

The provider reads encoded `region`, `amm` and `supervisor` URL params on
initial mount. The former Team `sup` URL key remains an input compatibility
fallback only; new URLs serialize `supervisor`.

## Semantic option sources

No Region/AMM/Supervisor option is built from Team mock rows or a hard-coded
person list.

| Level | Query factory | Exact semantic result |
| --- | --- | --- |
| Region | `src/queries/dim-region.ts` | `[regionId]`, `[regionLabel]` |
| AMM | `src/queries/dimamm.ts` | `[ammId]`, `[ammLabel]`, `[regionId]` |
| Supervisor | `src/queries/dimsup.ts` | `[supervisorId]`, `[supervisorLabel]`, `[ammId]`, `[regionId]` |

`useOrganizationFilterOptions(draftFilters)` sends Region to `dim-amm` and
Region + AMM to `dim-supervisor` in both direct Fabric DAX and backend
registered-query params. `"all"` omits the corresponding DAX `TREATAS`;
encoded values are applied to Region ID, `amm_id` and `sup_id`.

## Overview consumption

`OverviewPage` reads shared applied state and passes it unchanged to:

```text
useOverviewData
├── useKpiMtdData
└── useKpiMtdTrendData
```

Both semantic paths pass Region, AMM and Supervisor to the existing
`kpiMtd`/`kpiMtdTrend` factories and backend request contracts. Draft state
is never passed to these queries.

The non-semantic legacy Overview coverage/base market view remains outside
this filter migration; only its existing semantic MTD consumers are
filter-aware.

## Team consumption

`TeamPage` passes shared `appliedFilters` unchanged to the active source:

```text
Region → useTeamRegionKpiData
AMM    → useTeamAmmKpiData
```

Only the selected source is enabled.

- `filters.region === "all"` keeps all rows from `dim-region` in the existing
  business order.
- A selected Region is matched only by
  `region.filterValue === filters.region`.
- Each Region KPI call replaces only Region with that row's encoded ID and
  combines it with the selected encoded AMM and Supervisor.
- AMM entities are parsed directly from `[ammId]`, `[ammLabel]`,
  `[regionId]` returned by `dim-amm`; provider `ammOptions` and Team mock rows
  are not an entity source.
- A selected Region or AMM is matched only by its encoded ID.
- With Region `all`, each AMM request uses its encoded `[regionId]` when
  present. With a selected Region, every AMM request uses that applied Region.
- Every AMM request uses its encoded `[ammId]` and forwards the applied
  Supervisor unchanged.
- Both the direct `kpiMtd` request and backend
  `overview-kpi-summary` request receive all three values.

Each visible Region or AMM is queried separately. The frontend therefore
normalizes over the active visible rows:

```text
contributionNv     = countNv / sum(visible countNv)
contributionNvFail = nvFail / sum(visible nvFail)
```

A single positive visible entity has contribution `1`. A zero total remains
`null`. AMM collection size is dynamic and is not limited to four rows.

## Legacy Team limitation

Team Risk, employee details and Team Details still use
`src/feature/team/data/team.raw.json`; no semantic query at their required
grain exists in this project. They do not own filter state or options.

`adaptOrganizationFiltersToLegacyTeamFilters` resolves the shared, applied
semantic IDs through the stable applied labels, then maps those labels to
the existing local Region/AMM/Supervisor fields. It fails closed when a
semantic label is missing, ambiguous or does not exist in the legacy source,
instead of decoding IDs, guessing labels or silently showing unfiltered
rows. This adapter is the only permitted label boundary; the semantic Team
Region and AMM KPI paths never match by label.

## Removed runtime sources

- `src/feature/overview/components/FilterSheet.tsx`
- `src/feature/overview/hooks/useOverviewFilters.ts`
- `src/feature/overview/hooks/useOverviewFilterOptions.ts`
- `src/feature/team/components/filters/TeamFilterSheet.tsx`
- Overview `.simple-filter-*` CSS rules
- Team `.team-filter-*` and `.team-sheet-actions` CSS rules
- Team mock option builders `selectTeamFilterOptions` and
  `normalizeTeamFilterDraft`

The old feature files and barrel exports are not part of the runtime graph.
