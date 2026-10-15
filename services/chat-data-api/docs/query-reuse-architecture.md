# Query Reuse Architecture

## Principle

`NEW QUESTION != NEW DAX`. Chat questions map to existing Unime query factories. Semantic calculations remain model measures. The Chat service validates parameters, selects an allowlisted capability, executes its generated artifact, and formats a compact response.

## Build-time source reuse

The current Unime factories are Vite/browser modules (`?raw`, `@/` aliases, and browser access-session imports), so the Node service cannot safely import them at runtime. `scripts/generate-query-capabilities.mjs` uses an isolated esbuild adapter to execute only approved factories during build. It generates `src/generated/query-capabilities.generated.ts` with:

- the exact query produced by the existing factory;
- the exact metadata column contract;
- source file provenance and a SHA-256 source hash;
- parameter placeholders derived from validated sentinel values.

The generated module is derived output and must never be hand-edited. `dev`, `typecheck`, `test`, and `build` regenerate it, so stale source snapshots fail through generation or contract tests.

## Current registry

| Question | Capability | Existing factory | Enabled scope | Projection |
|---|---|---|---|---|
| `coverage_store` | `market.summary` | `src/queries/market.ts#market` | Nationwide | `[coverage_shop]`, `[plan_shop]`, `[coverage_shop_perc]` |
| `coverage_employee` | `market.summary` | `src/queries/market.ts#market` | Nationwide | `[coverage_emp]`, `[plan_emp]`, `[coverage_emp_perc]` |

The existing factory returns the complete Market summary row. The Chat formatter projects the three required fields and converts the semantic ratio to percentage points. It does not recalculate the measure.

## Audited reusable capabilities

### Overview and Market

- `market()` — cycle summary and existing Region/AMM/Supervisor/Employee/NPP filters.
- `marketCoverageTrend()` — five-day coverage trend.
- `marketCoverageByOrganization()` — Region, AMM, or Supervisor grain.
- `marketGapShopDetails()` — existing gap-store details.
- `marketDates()` — available semantic dates.
- `overviewTeamKpis()` — KPI summary by existing cycle/time-view/org filters.
- `kpiMtdTrend()` — existing daily KPI trend.
- `dimDate()` and `timeView()` — existing dimension capabilities.

### Team

- `teamGroupedKpi()` — Region/AMM/Supervisor grain; not a one-row Nationwide total.
- `teamManagerSummary()` — existing manager-level KPI summary.
- `teamEmployeeKpi()` and `teamEmployeeKpiMatrix()` — employee grain.
- `teamEmployeeDetails()` and `teamEmployeeTrend()` — selected employee capabilities.
- Existing NPP, gap-shop, streak-fail, and supervisor-risk factories.

## Scope and filter policy

Only Nationwide is enabled for Chat today. The source Market capability already accepts Region, AMM, Supervisor, Employee, and NPP filters, but those inputs remain disabled until matching question contracts and authorization exist. Future enablement must package the existing factory parameter path; it must not append new DAX.

An organizational question is `UNSUPPORTED` when the existing factory lacks its requested grain or filter. For example, a one-row Nationwide Team KPI total is not provided by `teamGroupedKpi()` and must not be synthesized.

## Adding a question

1. Identify an existing factory whose measures, grain, and filters answer the question.
2. Add that factory to the allowlisted build adapter.
3. Generate its query and metadata artifact with source provenance.
4. Add a registry mapping and validated parameter contract.
5. Add response projection/formatting only.
6. Run exact fixture, DAX-output, and live parity tests.

If step 1 fails, classify the question as `UNSUPPORTED` and document the missing measure, grain, or filter capability.
