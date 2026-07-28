# Overview page source of truth

## 1. Runtime source

- Page orchestration: `src/feature/overview/pages/OverviewPage.tsx`.
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
| OverviewPage | Period/date/filter state composition, callbacks, sticky visibility, measured compact-host alignment, routes and overlays. |
| Overview DateNavigator | Previous/next controls and date label markup. Its `.mtd*` CSS remains in `overview.css`. |
| `useOverviewPeriod` | Canonical `period`, report date, formatted date label and previous/next transitions. |
| `useOverviewFilters` | Canonical applied/draft filters, badge count and filter-sheet lifecycle. |

The shared header does not import Overview types, formatters, components or Team files. It receives a feature-rendered `ReactNode` through `dateNavigator`.

## 5. State and callback flow

```text
PeriodTabs
→ setPeriod
→ useOverviewPeriod
→ period + dateLabel + previous/next callbacks
→ Overview DateNavigator ReactNode
→ DashboardHeader / DashboardCompactHeader slots

useOverviewFilters
→ appliedFilterCount + openFilterSheet
→ shared full/compact Filter buttons
```

Full and compact headers render separate presentation nodes because they occupy different DOM locations, but both nodes receive the same values and callbacks from the same hooks. No period, report-date or filter state is copied into either header.

Changing Previous/Next may update the canonical period through `useOverviewPeriod`; Today, 7 Ngày and MTD still update the same `period` via `PeriodTabs`.

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
- Do not duplicate period, date or filter state.
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

## 9. Validation checklist

- At 430px, 390px and 360px, full Date Navigator and Filter must not overlap or overflow.
- At the top, compact header is hidden.
- After the original action row crosses the `#app` top edge, compact header is fixed and aligned with `.phone`.
- `window.scrollY` and document scroll remain zero during `#app` scrolling.
- Returning `#app` to zero hides compact header.
- Previous/Next updates the single canonical date.
- Filter opens the Overview sheet; applying a filter updates both badge instances from the same count.
- Logout keeps its existing Overview behavior.
- Today, 7 Ngày and MTD update the header without losing sticky behavior.
- Build, lint and unit tests must pass.

