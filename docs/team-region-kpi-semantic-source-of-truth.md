# Team Region KPI Semantic Source of Truth

Updated: 29/07/2026

## Scope

The Team Region chart and Region table no longer use Team mock rows.

The implementation reuses:

```text
src/queries/kpimtd.dax
src/queries/kpimtd.ts
```

No separate Team Region KPI DAX/TS query exists.

## Flow

```text
dim-region
→ Region ID + label
→ existing kpimtd request for each Region
→ selected cycleKey
→ selected dim-kpi kpi_id
→ Team chart and Region table
```

## Mapping

```text
mtdKpiSelected      → chart percentage
gap                 → Vượt/Gap
countNv             → total employees
contributionNv      → employee contribution
nvFail              → failed employees
contributionNvFail  → failed contribution
```

The chart and Region table have no mock fallback.

The AMM level is implemented separately with `dim-amm` plus one existing
`kpimtd`/`overview-kpi-summary` request per visible AMM. It does not change
the Region path or introduce a new DAX query. Shared AMM and Supervisor
selections are passed to every per-Region request. Region identity is matched
by encoded semantic ID, never label.

Risk and employee-detail sections remain on their current source because
they require different query grains. They consume the shared filter through
the documented fail-closed legacy adapter; see
`docs/organization-filter-source-of-truth.md`.

## Backend

The existing queryId `overview-kpi-summary` accepts optional `kpiId` and
returns sixteen columns.
