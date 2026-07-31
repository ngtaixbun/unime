# Dashboard Header source of truth

## Ownership

```text
src/components/dashboard-header/
├── DashboardHeader.tsx
├── DateNavigator.tsx
├── HeaderFilterTrigger.tsx
├── dashboard-header.css
└── index.ts
```

Overview and Team import this shared boundary. The former path
`src/components/DashboardHeader.tsx` is no longer present.

The Header owns:

- Unilever logo;
- title;
- always-present optional cycle slot;
- Back control;
- Date Navigator rendering;
- Filter Trigger and applied-count badge;
- full and compact presentation;
- shape, sizing, spacing, icons, focus/active/filtered states and responsive
  behavior.

Consumers pass title/cycle text, Date Navigator props, callbacks, filter count
and the optional `sticky` behavior modifier. They do not pass arbitrary date
JSX.

## Stable DOM contract

```text
header.dashboard-header.overviewFullHeader
├── .nwHeaderIdentityRow
│   ├── .nwHeaderBrand > img
│   ├── .dashboard-header__heading
│   │   ├── h1.nwHeaderTitle
│   │   └── p.nwHeaderCycle
│   └── button.nwHeaderBackBtn
└── .screenHeader
    └── .toprow.nwHeaderControlsRow
        ├── .overviewFullHeaderDateSlot
        │   └── .dashboard-date-navigator
        └── .overviewFullHeaderFilterSlot
            └── button.dashboard-filter-trigger
```

The cycle `<p>` exists for both pages. Overview marks it empty/hidden; Team
fills it. Title geometry therefore does not depend on whether cycle text is
present.

The `.screenHeader .toprow` nesting remains the Overview compact-header
trigger. Team opts into `data-sticky="true"`; shared visual dimensions do not
change.

## Date Navigator

`DateNavigatorProps` is:

```ts
interface DateNavigatorProps {
  prefix: string;
  value: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
```

Both arrow buttons always exist. A boundary disables and visually hides its
button, preserving centered label geometry and the same DOM on both pages.
Business/date logic is not implemented in the component.

## Filter Trigger

`HeaderFilterTrigger` receives only applied count, open callback and optional
aria label. It owns one icon, badge, dimensions and all interaction visuals.
Overview and Team open the same shared Organization Filter state and sheet
from `src/components/organization-filter`. Full/compact Overview and Team
continue to use this one trigger; the complete filter contract is documented
in `docs/organization-filter-source-of-truth.md`.

## CSS

`dashboard-header.css` is the only Header/Date Navigator/Filter Trigger
presentation source. It has no `.overview-page` or `.team-page` selector.
Global design tokens and component sizing tokens live in `src/global.css`.

`overview.css` owns only the fixed compact-host geometry and Overview content.
`team.css` owns only Team content and sheets.

## Behavior

- Overview Back: toast `Landing chưa được triển khai`.
- Team Back: route to Overview.
- Overview has no cycle label.
- Team displays the migrated report cycle.
- Overview alone mounts the optional compact Header host.
- Team alone enables the shared sticky full-header modifier.
