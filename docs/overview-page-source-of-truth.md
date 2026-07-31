# Overview page source of truth

## Runtime ownership

- Page orchestration and compact-header activation:
  `src/feature/overview/pages/OverviewPage.tsx`.
- Backend-mode request client:
  `src/lib/backend-semantic-model-client.ts`.
- Backend CORS policy and environment parsing:
  `backend/src/app.ts` and `backend/src/config/env.ts`.
- Semantic report cycles: `src/queries/dimdate.dax`,
  `src/queries/dim-date.ts`, `useDimDateData`.
- Overview adapter over the shared report-period hook:
  `src/feature/overview/hooks/useOverviewPeriod.ts`.
- Shared Header, Date Navigator and Filter Trigger:
  `src/components/dashboard-header`.
- Shared Period Mode: `src/components/report-period`.
- Shared Bottom Navigation and App Shell: `src/components`.
- Shared Organization Filter state, semantic options, sheet and CSS:
  `src/components/organization-filter`.
- Overview-only content/compact-host CSS:
  `src/feature/overview/assets/styles/overview.css`.

There is no Overview-owned Date Navigator, Period Tabs or Bottom Navigation
implementation. There is also no Overview-owned filter state, option hook or
sheet implementation; see `docs/organization-filter-source-of-truth.md`.

## Backend mode and CORS

When `VITE_DATA_SOURCE=backend`, the configured backend target is:

```text
VITE_API_BASE_URL/api/dax/query
```

Development and production intentionally use different transport boundaries:

```text
development browser
→ same-origin /api/dax/query
→ Vite dev proxy
→ VITE_API_BASE_URL/api/dax/query

production browser
→ VITE_API_BASE_URL/api/dax/query
```

The Vite proxy removes the local browser's `Origin` header before its
server-to-server request. Local development therefore works on an explicitly
selected Vite port without depending on Render's browser CORS allowlist.

Production requests use `POST` with `Content-Type: application/json`, so a
CORS preflight is expected whenever the frontend and backend origins differ.
`CORS_ORIGINS` is a comma-separated, exact-origin allowlist owned by the
backend deployment. The backend development fallback includes:

```text
http://localhost:5173
http://localhost:5174
```

No wildcard origin is used. Vite is configured with port `5173` and
`strictPort: true` so an occupied default port fails visibly instead of
silently changing the browser origin. A deliberate alternative such as
`--port 5174` continues to use the same-origin proxy.

Changing `backend/.env` affects only a locally started backend. The Render
service requires its own environment update and restart/redeploy. The
2026-07-28 incident, evidence and operational verification are recorded in
`docs/overview-backend-cors-incident.md`.

## Period and cycle behavior

Overview uses the shared `ReportPeriod = "today" | "7days" | "mtd"` contract
and shared date utilities. The feature adapter converts semantic cycle end
values to report-date anchors and maps the selected anchor back to the exact
semantic `cycleKey` used by KPI queries.

The model-declared latest cycle remains the upper navigation boundary. If a
refresh removes the selected cycle, Overview resets to the refreshed latest
cycle. Moving backward does not auto-switch the period.

MTD labels now follow the shared semantic contract: first calendar day of the
anchor month through the anchor. The frontend does not use the legacy semantic
cycle start value as the displayed MTD boundary.

The existing availability rule remains:

- MTD enabled.
- Today and 7 Ngày render in the shared control but show
  `Chức năng này chưa được triển khai`.
- A disabled period arriving in the URL is normalized to MTD.

This preserves the current real-data constraint: only MTD has a connected
semantic-model KPI path.

## Header and Back

Overview supplies title `Tổng quan`, an empty cycle slot, semantic report
props, filter count/open callback and Back callback to the shared Header.
Back displays `Landing chưa được triển khai`.

The compact Header remains Overview-only optional behavior. It receives the
same Date Navigator props and Filter Trigger state as the full Header.

## Scroll contract

`main#app.app-shell__scroll` is the sole content scroll owner.
The compact host remains outside AppShell, aligned to `.phone` with measured
CSS variables. Bottom Navigation and feature overlays remain outside the
content scroll.

## URL

Overview writes:

```text
period=mtd
date=YYYY-MM-DD
region=<encoded-id|all>
amm=<encoded-id|all>
supervisor=<encoded-id|all>
```

Navigating to Team carries these values. Returning with a period unavailable
to Overview normalizes to MTD; the date is clamped through the semantic-cycle
adapter.

## CSS cleanup

`overview.css` no longer contains shared Date Navigator, Period Mode,
Filter Trigger, Header or Bottom Navigation presentation selectors.
It retains only the compact-host integration and Overview-specific content.
