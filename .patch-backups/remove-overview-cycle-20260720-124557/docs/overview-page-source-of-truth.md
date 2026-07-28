# Overview Page — Source of Truth

## 1. Project structure

- Framework: React + TypeScript + Vite.
- Entry point: `src/main.tsx`, which mounts `<App />` into `#root`.
- Root layout: `src/App.tsx` renders `OverviewPage` directly.
- Overview route/page: `src/feature/overview/pages/OverviewPage.tsx`.
- Main Overview files: `src/feature/overview/components/*`, `src/feature/overview/hooks/*`, `src/feature/overview/lib/*`, `src/feature/overview/data/overview-period.data.ts`, and `src/feature/overview/assets/styles/overview.css`.
- Global CSS: `src/global.css`.
- Header: `src/components/DashboardHeader.tsx`.
- Navigation: `src/feature/overview/components/BottomNavigation.tsx`.

## 2. Actual DOM hierarchy

```text
body
└── #root
    └── .overview-page
        └── .shell
            └── .phone.onb-phone.onb-dashboard
                ├── main#app.app.memv2-app
                │   └── section#memOverviewView.flow.memv2-flow.active
                │       └── #memOverviewRoot
                │           └── .memv2-page
                │               ├── .nwUnifiedHeader.overviewUnifiedHeader.dashboardUnifiedHeader
                │               │   ├── .nwHeaderTitleRow
                │               │   └── .screenHeader
                │               │       └── .toprow
                │               ├── .overviewPeriodBelow
                │               ├── overview state blocks, when needed
                │               └── Overview content sections and KPI tables
                ├── .overviewCompactHeaderHost
                │   └── .overviewCompactHeader
                ├── nav#memMainNav.helpNavReady.profileNavReady
                ├── .simple-filter-overlay
                └── .route-toast
```

## 3. Scroll architecture

- Real scroll owner: `main#app.app.memv2-app`.
- Runtime verification: after scrolling, `window.scrollY = 0`, `document.scrollingElement.scrollTop = 0`, and `#app.scrollTop = 160`.
- `body`, `#root`, `.overview-page`, `.shell`, and `.phone` all match viewport height at runtime and do not scroll.
- `.phone` is the frame: `position: relative; overflow: hidden; height: 100dvh; max-height: 932px; width: min(430px, 100vw)`.
- `#app` owns scroll because it has `height: 100%`, `overflow-y: auto`, and content height larger than its client height.
- Bottom Navigation is outside `#app` and inside `.phone`, so it does not scroll with Overview content.

## 4. Sticky header implementation

- Mechanism: fixed compact header, not CSS sticky.
- Component rendering compact header: `OverviewPage.tsx` renders `.overviewCompactHeaderHost` outside `#app` and inside `.phone`.
- Compact header content: `DashboardCompactHeader` from `src/components/DashboardHeader.tsx`.
- Compact header contains only Date Navigator and Filter.
- Trigger to show: `.screenHeader .toprow` from the full header has `getBoundingClientRect().bottom <= #app.getBoundingClientRect().top + 1` and `#app.scrollTop > 0`.
- Trigger to hide: the original `.toprow` bottom returns below the top of the `#app` viewport, including at `#app.scrollTop = 0`.
- Scroll listener: one passive `scroll` listener on `#app`.
- Resize tracking: `ResizeObserver` observes `.phone`, `#app`, and the original `.toprow`; `window.resize` is also handled.
- Cleanup: the `useEffect` in `OverviewPage.tsx` cancels the pending animation frame, removes the `#app` scroll listener, removes the `window.resize` listener, and disconnects the `ResizeObserver`.
- Alignment: `OverviewPage.tsx` measures `.phone.getBoundingClientRect()` and writes `--overview-sticky-left`, `--overview-sticky-top`, and `--overview-sticky-width` onto `.overviewCompactHeaderHost`.
- CSS positioning: `.overviewCompactHeaderHost { position: fixed; top: var(--overview-sticky-top); left: var(--overview-sticky-left); width: var(--overview-sticky-width); }`.
- z-index: compact header uses `z-index: 180`; Bottom Navigation uses `z-index: 120`; Filter Sheet uses `z-index: 2000`.
- Height: runtime compact host height is about `66px`; `.overviewCompactHeader` height is about `58px`.
- Content spacing: the fixed compact header does not reserve layout space. Content scrolls underneath it while the header stays fixed.

## 5. Component ownership

```text
DashboardHeader.tsx
- Owns full header markup, compact header markup, Date Navigator composition, Filter button composition, and the forwarded action-row ref.

OverviewPage.tsx
- Owns Overview state composition, period/date/filter callbacks, selected route, sticky visibility state, scroll detection, fixed-header alignment, and cleanup.

overview.css
- Owns phone frame CSS, #app scroll container CSS, full header styling, compact header positioning/styling, Bottom Navigation styling, filter sheet styling, and responsive breakpoints.

BottomNavigation.tsx
- Owns nav item rendering and route button callbacks only.

global.css
- Owns global tokens, theme variables, base document height, and body base styling.

main.tsx
- Owns React root mounting.

App.tsx
- Owns root app component selection and currently renders OverviewPage directly.
```

## 6. State and callback flow

```text
PeriodTabs
→ setPeriod
→ useOverviewPeriod updates period/dateLabel
→ useOverviewData(period)
→ DashboardHeader and DashboardCompactHeader receive the same period/dateLabel/callbacks
```

- `dateLabel` comes from `useOverviewPeriod`.
- Previous Date: `goToPreviousDate` is passed to both full and compact Date Navigator.
- Next Date: `goToNextDate` is passed to both full and compact Date Navigator.
- Filter Sheet: `openFilterSheet` is passed to both full and compact Filter buttons.
- Filter badge: `appliedFilterCount` is passed to both full and compact Filter buttons.
- Today / 7 Days / MTD: `PeriodTabs` calls `setPeriod`; both header variants receive the updated `period` and `dateLabel`.
- Back-to-old-date logic remains in `useOverviewPeriod`; compact header reuses the same callbacks and does not own date state.

## 7. CSS source of truth

- Phone frame selector: `.overview-page .phone`.
- Scroll container selector: `.overview-page .app` and `main#app`.
- Full header selectors: `.nwUnifiedHeader.overviewUnifiedHeader`, `.nwHeaderTitleRow`, `.screenHeader`, `.toprow`.
- Compact header selectors: `.overviewCompactHeaderHost`, `.overviewCompactHeaderHost.active`, `.overviewCompactHeader`, `.overviewCompactHeaderDate`.
- Bottom Navigation selector: `.overview-page #memMainNav`.
- Filter selectors: `.simple-filter-overlay`, `.simple-filter-overlay.show`, `.simple-filter-sheet`.
- Responsive breakpoints: `@media (max-width: 390px)` and `@media (max-width: 360px)` in `overview.css`.
- Do not override the scroll owner, phone frame, compact header, or bottom nav selectors outside `overview.css`.

## 8. Invariants — Do not break

- Keep exactly one scroll owner: `#app`.
- Keep exactly one sticky/fixed implementation for the Overview compact header.
- Do not reintroduce `.overviewStickySentinel`.
- Compact header must not contain logo, title, cycle label, or Back button.
- Compact header must reuse the same Date Navigator and Filter callbacks as the full header.
- Do not duplicate period, date, or filter state for the compact header.
- Do not use `!important`.
- Do not hardcode phone width or left offset in JavaScript; use `.phone.getBoundingClientRect()`.
- Bottom Navigation stays outside `#app` and inside `.phone`.
- Filter Sheet must stay above both compact header and Bottom Navigation.
- Do not add a document-level scroll listener unless the scroll architecture changes and is reverified.

## 9. Removed legacy implementation

- Removed `stickySentinelRef`.
- Removed `.overviewStickySentinel` from the DOM.
- Removed sentinel-offset based activation.
- Removed document capture scroll listener.
- Removed old sticky marker comments around the state/effect block.
- Kept `DashboardCompactHeader`, but it is now driven by the measured original `.toprow`, not by a sentinel.
- Added the missing CSS for `.overviewCompactHeaderHost` and `.overviewCompactHeader`; before this fix, the host could receive `active` while remaining `position: static` below the phone frame.

## 10. Runtime verification

```text
scroll owner: #app
body scrollTop: 0
document.scrollingElement scrollTop: 0
#app scrollTop after test scroll: 160
compact header position while active: fixed
compact header active rect: top 0, bottom 66, width 430 on 430px viewport
compact header desktop alignment: phone left 297, compact host left 297 on 1024px viewport
compact header mobile alignment: phone left 0, compact host left 0 on 360px viewport
compact header trigger: original .screenHeader .toprow bottom <= #app viewport top + 1
compact header hide: #app scrolls back to 0 and original .toprow bottom returns to 102
visible Date Navigators while scrolled: 1
```

DevTools recheck:

```js
const app = document.querySelector("#app");
const row = document.querySelector(".screenHeader .toprow");
const compact = document.querySelector(".overviewCompactHeaderHost");

({
  windowScrollY: window.scrollY,
  documentScrollTop: document.scrollingElement?.scrollTop,
  appScrollTop: app?.scrollTop,
  rowBottom: row?.getBoundingClientRect().bottom,
  appTop: app?.getBoundingClientRect().top,
  compactClass: compact?.className,
  compactPosition: compact ? getComputedStyle(compact).position : null,
});
```

## 11. Test checklist

- At top: full header shows logo, `Tổng quan`, cycle, Back, Date Navigator, and Filter; compact header is hidden.
- Scroll down: logo/title/cycle scroll away; compact header appears and remains fixed.
- Scroll content under compact header: tables and cards continue scrolling inside `#app`.
- Scroll back to top: compact header hides and full header is normal.
- Today: compact header remains active after selecting `Hôm nay` and scrolling.
- 7 Days: compact header remains active after selecting `7 Ngày` and scrolling.
- MTD: compact header remains active after selecting `MTD` and scrolling.
- Previous Date from compact header updates the date label.
- Next Date from compact header updates the date label.
- Filter from compact header opens `.simple-filter-overlay.show`.
- Badge uses the same `appliedFilterCount` as the full header.
- Bottom Navigation remains fixed at the bottom of `.phone`.
- No double scroll: `window.scrollY` and `document.scrollingElement.scrollTop` remain `0` during app scroll.
- Build command verified: `npm run build`.
- Lint command verified: `npm run lint`.
- Test command verified: `npm run test`.
