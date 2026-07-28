# Team page source of truth

## Phạm vi và source cuối

Team được migrate từ file root `team.html` do người dùng cung cấp. Đây là file Team mới nhất và duy nhất được tìm thấy trong project tại thời điểm audit. File chứa hai screen `teamOverview` và `riskDetail`, CSS độc lập, JavaScript imperative, logo base64 và JSON `team-data`.

Sau migration, `team.html` đã bị xóa khỏi runtime để Vite không ưu tiên file tĩnh này cho URL `/team`. Dữ liệu JSON trong source đã được trích nguyên vẹn sang `src/feature/team/data/team.raw.json` và được kiểm tra serialize khớp source:

- 1.800 dòng dữ liệu.
- 180 nhân viên.
- 10 ngày từ 01/06/2026 đến 10/06/2026.
- 5 KPI: `calls`, `beat`, `time`, `osa`, `qc`.
- Threshold rớt KPI: 80%.

`team.raw.json` hiện là data source thực tế của migration. `team.queries.ts` là read-only adapter để có thể thay bằng query backend đã kiểm chứng sau này mà không đổi consumer.

## Cấu trúc feature

```text
src/feature/team/
├── assets/styles/
│   ├── team.css
│   └── team-details.css
├── components/
│   ├── details/
│   │   ├── TeamByKpiPanel.tsx
│   │   ├── TeamDetailsTabs.tsx
│   │   ├── TeamEmployeeCard.tsx
│   │   ├── TeamEmployeeRow.tsx
│   │   ├── TeamManagerPanel.tsx
│   │   ├── TeamMultiKpiPanel.tsx
│   │   ├── TeamNppPanel.tsx
│   │   └── TeamStreakPanel.tsx
│   ├── employee/TeamEmployeeDetailsSheet.tsx
│   ├── filters/TeamFilterSheet.tsx
│   ├── overview/
│   │   ├── TeamKpiSection.tsx
│   │   └── TeamRiskOverview.tsx
│   └── index.ts
├── data/
│   ├── index.ts
│   ├── team.data.ts
│   └── team.raw.json
├── hooks/
│   ├── index.ts
│   └── useTeamState.tsx
├── lib/
│   ├── index.ts
│   ├── team.aggregations.spec.ts
│   ├── team.aggregations.ts
│   ├── team.constants.ts
│   ├── team.formatters.ts
│   └── team.selectors.ts
├── pages/
│   ├── TeamDetails.tsx
│   └── TeamPage.tsx
├── queries/
│   ├── index.ts
│   └── team.queries.ts
├── types/
│   ├── index.ts
│   └── team.ts
└── index.ts
```

## Page và component ownership

### TeamPage

`TeamPage` chỉ điều phối state riêng của overview (`selectedMetric`, `selectedLevel`, `selectedEntity`), gọi `useTeamOverview`, ghép header/KPI/risk sections và map entry point sang URL TeamDetails.

- `TeamKpiSection` sở hữu 5 KPI tabs, bar chart, target 80%, selection/dim state rendering, 2 level tabs và entity table.
- `TeamRiskOverview` sở hữu histogram, top KPI, max streak, 3 risk groups, top SUP/NPP và drill-down mapping.
- `DashboardHeader` là shared component tại `src/components/dashboard-header`; Team truyền `DateNavigator` riêng qua ReactNode slot.
- `BottomNavigation` là shared component tại `src/components`; active route là Team.

### TeamDetails

`TeamDetails` sở hữu detail header, tab/search-param orchestration, back navigation và chọn panel đang render. Title thực tế là `Chi tiết Đội ngũ`.

- `TeamByKpiPanel`: metric order theo average tăng dần, chỉ hiển thị nhân viên rớt và sort KPI% tăng dần.
- `TeamStreakPanel`: streak liên tiếp đến report date, tối thiểu 2 ngày, sort streak giảm dần rồi KPI% tăng dần.
- `TeamMultiKpiPanel`: nhóm high/watch/safe, max lần lượt 5/2/0 KPI, every-selected-metric filter và toast khi vượt giới hạn.
- `TeamManagerPanel`: Region → AMM → Mer Sup → nhân viên, risk employee only.
- `TeamNppPanel`: aggregate OSA actual/target, unique employee count, sort tỷ lệ tăng dần.

### Overlay ownership

- `TeamFilterSheet` thuộc feature Team, có draft/apply/reset, dependent options, Escape/backdrop/close button và dialog semantics.
- `TeamEmployeeDetailsSheet` là overlay, không phải page. Nó sở hữu metadata, bảng 5 KPI, KPI tabs, trend 7 ngày, selected date, delta, missing state, mood và internal scroll.
- Cả hai overlay được mount ngoài content flow nhưng bên trong viewport của shared App Shell.

## Hook, data, query và pure logic ownership

- `TeamProvider` trong `useTeamState.tsx` là shared state owner cho TeamPage và TeamDetails.
- `useTeamOverview` tạo overview view model.
- `useTeamDetails` cung cấp rows/report context cho detail panels.
- `useTeamEmployeeDetails` tạo selected row và trend view model.
- `team.data.ts` typed-import dữ liệu raw.
- `team.queries.ts` là adapter read-only hiện tại.
- `team.constants.ts` sở hữu metric definitions, threshold, region order, risk copy và chart scale.
- `team.selectors.ts` sở hữu date/filter/group/options/index selectors.
- `team.aggregations.ts` sở hữu average, fail/risk, entity stats, multi KPI, streak, SUP/NPP, trend/delta và sort.
- `team.formatters.ts` sở hữu percent/number/date/signed-delta formatting.

Pure lib không đọc DOM, không render JSX và không dùng React state.

## Route hierarchy và URL state

Router hiện tại là History API router nhỏ trong `src/App.tsx`; project không có `react-router-dom`.

```text
/
└── OverviewPage
/team
└── TeamPage
/team/details
└── TeamDetails
```

Detail context dùng search params:

- `?tab=by-kpi&metric=qc`
- `?tab=streak&metric=qc`
- `?tab=multi&group=high|watch|safe`
- `?tab=manager`
- `?tab=npp`

Đổi tab/metric/group dùng `history.replaceState`. Route-level navigation dùng `pushState` và App lắng nghe `popstate`.

## Shared state ownership

`TeamProvider` được mount quanh route switch trong `App.tsx`, nên state không bị tách giữa hai page:

- `dateIndex` / `reportDate`.
- applied `filters`.
- `draftFilters`.
- filter sheet open state.
- employee code/metric/selected date/open state.

State riêng của TeamPage: selected KPI, level và entity. State riêng của TeamDetails: active tab, detail/streak metric, multi group và selected metrics.

## DOM, App Shell và scroll

DOM runtime:

```text
.team-page hoặc .team-details
└── .app-shell
    └── .app-shell__viewport.phone
        ├── main#app.app-shell__scroll.app   ← scroll owner duy nhất
        ├── shared BottomNavigation          ← TeamPage only
        └── filter/employee overlays         ← ngoài content scroll
```

`AppShell` tại `src/components/AppShell.tsx` là frame dùng chung giữa Overview và Team. `main#app` là scroll owner duy nhất; `body` bị khóa scroll. Team không tạo phone frame, bottom nav hoặc scroll system riêng.

TeamDetails tabs sticky theo chính `main#app`. TeamDetails không render Bottom Navigation.

## Header và Bottom Navigation

`DashboardHeader` đã được generic hóa: title, cycle label, filter badge và Date Navigator slot đều qua props. Team sở hữu date prefix/value, disabled date boundaries và previous/next callbacks trong `src/feature/team/components/DateNavigator.tsx`; shared header không phụ thuộc type/helper/component của Overview hoặc Team.

`BottomNavigation` được nâng từ `feature/overview` lên `src/components`. Overview cập nhật sang shared nav; Team không còn toast unavailable và route `/team` hoạt động.

## Filter flow

1. Mở sheet copy applied filters sang draft.
2. Đổi Region reset AMM và Mer Sup.
3. Đổi AMM reset Mer Sup.
4. Options AMM/Mer Sup được derive từ current-date rows và draft parent filters.
5. `Áp dụng` normalize option không còn hợp lệ, cập nhật applied filters và đóng sheet.
6. `Xóa lọc` trả 3 field về `all` và đóng sheet.
7. Filter badge đếm 1–3 field khác `all`.
8. Cùng applied filters tác động TeamPage, TeamDetails và streak lịch sử.

## Date flow

- Date list lấy từ data meta.
- Mặc định ngày mới nhất 10/06/2026.
- Prev/next clamp tại hai biên; button biên bị disabled/ẩn.
- Đổi date cập nhật toàn Team view model.
- Entity selection không còn hợp lệ được loại khỏi effective selection.
- Employee trend vẫn đọc toàn bộ multi-day dataset.

## TeamPage → TeamDetails và back

Drill-down mapping:

- KPI rớt nhiều → `by-kpi` + top metric.
- Rớt chuỗi nhiều ngày → `streak` + max-streak metric.
- High/watch/safe → `multi` + group.
- SUP → `manager`.
- NPP → `npp`.

Back button từ TeamDetails gọi route `/team`. Vì `TeamProvider` ở trên route switch, date/applied filters/employee source vẫn giữ. Browser diagnostic xác nhận filter badge còn nguyên sau back.

## CSS source of truth

- Global semantic tokens: `src/global.css`.
- Shared shell/nav: `src/global.css` + `src/components`.
- Team overview/filter/employee: `team.css`, scoped dưới `.team-page`/`.team-details`.
- Team detail panels: `team-details.css`, scoped dưới `.team-details`.
- Không có `:root` riêng, `!important`, base64, global `.card/.list/.sheet` selector hoặc CSS override patch.
- Icons dùng Lucide, không dùng emoji/text symbols của legacy source.

## Legacy đã loại bỏ

- Xóa root `team.html` sau khi trích data; nếu giữ file này, Vite sẽ phục vụ nó thay vì React route `/team`.
- Xóa `src/feature/overview/components/BottomNavigation.tsx` sau khi nâng component lên shared.
- Không còn runtime `innerHTML`, `querySelector`, document event delegation, mutable global state, `dangerouslySetInnerHTML`, show/hide section giả route, base64 logo hoặc duplicate Team shell/nav.

## File tạo mới

- Toàn bộ `src/feature/team/**` trong tree phía trên.
- `src/components/AppShell.tsx`.
- `src/components/BottomNavigation.tsx`.
- `src/assets/unilever-logo.png` (brand asset shared, moved from Overview).
- `docs/team-page-source-of-truth.md`.

## File sửa

- `src/App.tsx`.
- `src/components/dashboard-header/`.
- `src/feature/overview/pages/OverviewPage.tsx`.
- `src/feature/overview/components/index.ts`.
- `src/global.css`.
- `src/queries/index.ts` (sửa duplicate `columnMetadata` export để strict TypeScript pass).
- `src/fabric.generated.ts` được build script generate lại từ `fabric.yaml`.
- `src/feature/overview/assets/images/unilever-logo.png` đã được di chuyển lên `src/assets/unilever-logo.png`.

## File xóa

- `team.html` (legacy runtime source; data đã migrate nguyên vẹn).
- `src/feature/overview/components/BottomNavigation.tsx`.

## Verification

### Static/build

- `npx tsc -p tsconfig.json --noEmit`: pass.
- `npm run lint`: pass, không warning/error.
- `npm run test`: pass, 4 files / 18 tests.
- `npm run build`: pass. Vite transform 1.954 modules và tạo production bundle.
- Forbidden-pattern scan trong Team/App/shared components: không có `innerHTML`, DOM query APIs, `dangerouslySetInnerHTML`, `!important` hoặc `data:image`.

Domain tests xác nhận exact data size, strict threshold 80%, risk totals, top KPI/SUP/NPP, region order, streak đến report date và trend 7 ngày/delta.

### Runtime diagnostic

Headless Chromium diagnostic đã pass:

- React `/team` route render đúng sau khi xóa legacy HTML conflict.
- 5 KPI, 2 level, selected/unselected entity.
- Target line 80% dùng cùng scale với bar; line nằm trên cột 72%.
- Prev/next date.
- Dependent Region → AMM → Mer Sup filters và badge.
- `/team/details`, title, 5 tabs, Bottom Navigation hidden.
- Multi KPI groups, limit và toast.
- Manager hierarchy và NPP view.
- Employee sheet, 7 trend points và selected date.
- Back giữ applied filter.
- Không console/page error.
- 350/360/390/430px: không document horizontal overflow, title visible, chart cao 224px và card padding 12px.

### Fabric portal embed

Flow chuẩn đã được thử với `devUri=http://localhost:5176`. Portal mở tại `app.fabric.microsoft.com`, không có LNA/chrome-error frame, nhưng persistent automation profile chưa có AAD session nên innermost app iframe không mount. Không tự động hóa đăng nhập theo quy định. Vì vậy Fabric-authenticated embed vẫn cần một lượt xác nhận thủ công sau khi người dùng đăng nhập profile.

## Giới hạn còn lại

- Team hiện dùng exact dataset được người dùng cung cấp trong HTML, chưa nối semantic model. Query adapter đã được đặt boundary để thay data source sau khi có DAX/schema được kiểm chứng.
- Production JS bundle khoảng 1,2 MB trước gzip do 1.800 rows được đóng gói; build thành công nhưng Vite báo chunk trên 500 kB. Khi backend Team sẵn sàng nên chuyển dataset sang runtime query và code-split routes.
- Fabric portal runtime cần AAD-authenticated persistent profile để hoàn tất xác nhận embed cuối.
