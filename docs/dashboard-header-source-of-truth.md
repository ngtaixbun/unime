# Dashboard Header source of truth

## 1. Purpose and files

Dashboard Header is the shared presentation boundary for Overview and Team.

```text
src/components/dashboard-header/
├── DashboardHeader.tsx
├── DashboardHeader.spec.tsx
├── dashboard-header.css
└── index.ts

src/assets/
└── unilever-logo.png
```

Consumers import from `@/components/dashboard-header`.

## 2. Public contract

`DashboardHeader` receives:

- `title` and optional `cycleLabel`.
- `dateNavigator: ReactNode`, created by the consuming feature.
- `appliedFilterCount` and `onOpenFilters`.
- `onLogout`.
- Optional `actionRowRef`, forwarded to `.screenHeader .toprow`.

`DashboardCompactHeader` receives:

- `dateNavigator: ReactNode`, created by the consuming feature.
- `appliedFilterCount` and `onOpenFilters`.

The component owns no period, report-date, date-navigation or filter state. It does not transform a feature's date label.

## 3. Ownership boundary

The shared component owns only:

- Unilever logo rendering.
- Title and optional cycle label.
- Logout control.
- Filter control and applied-count badge.
- Full-header and compact-header shells.
- Full/compact layout, visual styling and responsive CSS.

Each feature owns its Date Navigator:

- Overview: `src/feature/overview/components/DateNavigator.tsx` and `.mtd*` rules in `overview.css`.
- Team: `src/feature/team/components/DateNavigator.tsx` and `.mtd*` rules in `team.css`.

Dependency guard:

```bash
rg -n 'OverviewPeriod|getPeriodLabel|DateNavigator|feature/(overview|team)' \
  src/components/dashboard-header
```

Expected result: no matches in runtime component or CSS. The test may mention a generic fixture string only; it must not import feature code.

## 4. DOM contract

Full header:

```text
.overviewFullHeader
├── .nwHeaderIdentityRow
│   ├── .nwHeaderBrand > img
│   ├── h1.nwHeaderTitle
│   ├── button.nwHeaderLogoutBtn
│   └── p.nwHeaderCycle (optional)
└── .screenHeader
    └── .toprow.nwHeaderControlsRow
        ├── .overviewFullHeaderDateSlot > feature ReactNode
        └── .overviewFullHeaderFilterSlot > button.headerFilterBtn
```

Compact header:

```text
.overviewCompactHeader
├── .overviewCompactHeaderDate > feature ReactNode
└── button.headerFilterBtn
```

The `.screenHeader .toprow` nesting is a compatibility contract for Overview's sticky trigger and must not change without redesigning and revalidating that integration.

## 5. State ownership matrix

| State/behavior | Shared | Overview | Team |
| --- | --- | --- | --- |
| Logo/title/logout/filter rendering | Yes | Props/callback | Props/callback |
| Period/report date | No | `useOverviewPeriod` | `TeamProvider` |
| Previous/Next behavior | No | Overview DateNavigator callbacks | Team DateNavigator callbacks |
| Filter draft/applied state | No | `useOverviewFilters` | `TeamProvider` |
| Badge value | Render only | Canonical count | Canonical count |
| Overview compact visibility/geometry | No | `OverviewPage` | Not applicable |

Rendering a Date Navigator in both Overview header variants does not duplicate state; both nodes are controlled by the same hook values and callbacks.

## 6. CSS ownership

`dashboard-header.css` is the only source for shared header presentation:

- Full identity and controls-row layout.
- Logo, title, cycle label and logout visuals.
- Filter button/icon/badge visuals.
- Compact header inner layout and surface.
- Header responsive rules at `390px` and `360px`.
- Existing Overview and Team visual variants, scoped by their page root.

Feature CSS must not redefine shared header selectors. Feature Date Navigator CSS may use the `.mtd*` selectors and a contextual selector necessary to distinguish full and compact surfaces.

The Overview-only `.overviewCompactHeaderHost` fixed-position integration remains in `overview.css` because `OverviewPage`, not the shared component, owns its geometry and visibility.

## 7. Overview sticky integration contract

The shared header only forwards `actionRowRef`. It does not listen to scroll, observe layout, create a sentinel, render the compact host or decide visibility.

Overview must retain:

- `#app` as scroll owner.
- `.screenHeader .toprow` as trigger.
- Its existing passive scroll listener, window resize listener and `ResizeObserver`.
- `.overviewCompactHeaderHost` outside `#app`.
- `--overview-sticky-left`, `--overview-sticky-top`, `--overview-sticky-width`.
- `position: fixed` and `z-index: 180`.

## 8. Accessibility

- Logout is a native button with `aria-label="Đăng xuất"`.
- Filter is a native button with `aria-label="Mở bộ lọc"`.
- Zero badge count uses the native `hidden` attribute.
- Date accessibility belongs to the feature slot; both current navigators expose the group and Previous/Next button labels.

## 9. Validation matrix

At 430px, 390px and 360px verify:

- Logo/title/logout and Date Navigator/filter remain visible without overlap or overflow.
- Previous and Next update the active feature date and respect Team boundaries.
- Filter opens the correct feature sheet.
- Applying/clearing filters updates the same badge count in every visible header instance.
- Overview Logout keeps its existing unavailable-route feedback; Team Logout returns to Overview.
- Overview Today, 7 Ngày and MTD remain connected to the same period state.
- Overview compact header activates/hides from `#app` scrolling with no document scroll.
- Team full-header sticky behavior remains intact and Team does not render an Overview compact host.
- App console has no errors from the local app frame.

Static verification:

```bash
npm run build
npm run lint
npm run test
```
