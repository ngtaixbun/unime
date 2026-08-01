# Runbook đồng bộ thay đổi Semantic Model, DAX và Backend

## Mục tiêu

Tài liệu này dùng khi một thay đổi trong Power BI Semantic Model làm thay đổi
công thức measure, DAX query, filter, grain, tên cột, số lượng cột hoặc kiểu dữ
liệu mà frontend nhận được.

Mục tiêu là giữ cùng một contract xuyên suốt:

```text
Semantic Model
  → DAX query/factory phía frontend
  → DAX builder hoặc generic request phía backend
  → Power BI Execute Queries response
  → backend expected columns
  → frontend backend client
  → parser/hook
  → component
```

Chỉ cần một mắt xích dùng contract cũ là runtime có thể báo `Backend thiếu
cột`, `POWERBI_SCHEMA_MISMATCH`, `Invalid discriminator value` hoặc hiển thị
sai dữ liệu dù TypeScript vẫn build thành công.

## Hai chế độ backend hiện có

### Registered mode — chế độ mặc định

Frontend gửi:

```json
{
  "queryId": "team-employee-kpi",
  "params": {
    "cycleKey": 202608,
    "kpiId": 1,
    "region": "all",
    "amm": "all",
    "supervisor": "all"
  }
}
```

Luồng xử lý:

```text
src/hooks/use-semantic-model-query.ts
  → src/lib/backend-semantic-model-client.ts
  → POST /api/dax/query
  → backend/src/routes/dax.route.ts
  → backend/src/dax/<query>.ts
  → backend/src/services/powerbi-query.ts
```

Với mode này, thay đổi query contract thường phải sửa cả frontend và backend.

### Generic mode — chỉ dùng khi môi trường đã bật an toàn

Frontend gửi DAX và `expectedColumns` đến `POST /api/dax/execute`. DAX builder,
queryId và registry không cần nhân đôi ở backend.

Tuy nhiên production hiện không được bật generic DAX nếu chưa có inbound
authentication/authorization. Xem
[hybrid-generic-dax-backend.md](./hybrid-generic-dax-backend.md). Khi không chắc
môi trường đang dùng mode nào, coi `registered` là contract bắt buộc phải đồng
bộ.

## Bước 1 — Phân loại thay đổi trước khi sửa code

| Loại thay đổi | Phạm vi tối thiểu |
|---|---|
| Chỉ đổi công thức measure, tên measure và output alias không đổi | Deploy Semantic Model, chạy lại DAX thật và regression tests |
| Thêm/xóa/đổi alias output | DAX FE, metadata/type FE, DAX BE, expected columns, parser và tests |
| Đổi kiểu dữ liệu hoặc BLANK semantics | Type/interface, parser, UI formatting, test null/invalid values |
| Đổi grain hoặc khóa định danh | DAX grouping, uniqueness/integrity rules, parser và UI behavior |
| Thêm/đổi filter hoặc params | Query factory, backend request type, Zod schema, dispatcher và filter tests |
| Thêm query mới trong registered mode | Query FE, builder BE, route registry, client registry, hook/parser và tests |
| Đổi workspace/dataset/tenant | Cấu hình backend/deployment và quyền service principal; không hard-code trong query |

Không bắt đầu bằng cách chỉ thêm tên cột vào frontend client. Trước tiên phải
xác nhận Semantic Model và DAX thật sự trả cột đó.

Trước mỗi thay đổi, audit code runtime thay vì chỉ đọc số cột trong tài liệu
narrative. Một source-of-truth cũ có thể vẫn ghi 10 hoặc 16 cột trong khi
query/client hiện đã dùng 18 cột. Kết quả query thật và contract code đang chạy
là căn cứ cuối cùng; sau đó phải cập nhật lại tài liệu domain bị stale.

## Bước 2 — Xác minh Semantic Model trước

1. Publish hoặc refresh Semantic Model chứa measure/column mới.
2. Kiểm tra đúng tên table, column và measure. Column dùng dạng đầy đủ
   `'Table'[Column]`; measure dùng `[Measure]`.
3. Chạy DAX trực tiếp qua Fabric CLI với cùng model mà app sử dụng:

```bash
npx fabric-app-data query unimeModel --file path/to/runnable-query.dax
```

Nếu file app có placeholder như `__SELECTED_CYCLE_KEY__`, phải tạo phiên bản
runnable với giá trị test cụ thể hoặc lấy query đã được factory inject. Không
gửi nguyên placeholder lên Fabric.

4. Ghi lại contract thực tế từ kết quả CLI:

| Alias chính xác | Kiểu | Nullable | Ý nghĩa | Grain |
|---|---|---|---|---|
| `employeeId` | string/number | không | ID nhân viên | một dòng/nhân viên |
| `actual` | number | có | Actual measure | một dòng/nhân viên/KPI/cycle |
| `target` | number | có | Target measure | một dòng/nhân viên/KPI/cycle |
| `percentage` | number | có | MTD ratio | một dòng/nhân viên/KPI/cycle |

Không đoán tên cột từ DAX source. Dùng đúng tên trả về bởi query execution.
Kiểm tra cả row count, null, duplicate key và một vài giá trị nghiệp vụ.

## Bước 3 — Chốt contract trước khi implement

Trước khi sửa nhiều file, ghi rõ:

- query grain;
- output aliases và thứ tự;
- kiểu và nullable semantics;
- primary/integrity key;
- params bắt buộc và optional;
- encoded filter format (`all`, `number:<value>`, `string:<value>`);
- cột Semantic nhận từng filter;
- logic nào thuộc DAX, logic nào thuộc frontend;
- cách xử lý loading, error, empty và retry.

Tên alias là API contract. Không đổi alias chỉ để làm đẹp UI; dùng
`displayName` trong `columnMetadata` cho nhãn hiển thị.

## Bước 4 — Đồng bộ query phía frontend

Với mỗi registered query, kiểm tra đầy đủ:

1. `src/queries/<query>.dax`
   - dùng measure/column mới;
   - trả đúng alias đã chốt;
   - giữ các cột cần cho `FILTER`, `ORDER BY` và parser;
   - không còn placeholder sau khi factory inject.
2. `src/queries/<query>.ts`
   - cập nhật row interface;
   - cập nhật params;
   - cập nhật `columnMetadata` với key chính xác như `[actual]`;
   - inject tất cả filters vào đúng Semantic columns;
   - validate cycle, KPI ID và giá trị đầu vào.
3. `src/queries/index.ts`
   - export query/type mới nếu consumer dùng barrel import.
4. `src/queries/<query>.spec.ts`
   - assert alias count và exact metadata keys;
   - assert measure/column mới;
   - assert params/filter injection;
   - assert không còn placeholder;
   - assert input không hợp lệ bị reject.

Direct Fabric mode đọc contract từ DAX và `columnMetadata`, nên bước này vẫn
bắt buộc ngay cả khi backend mode đang là registered.

## Bước 5 — Đồng bộ registered backend

### 5.1 DAX builder

Cập nhật hoặc tạo `backend/src/dax/<query>.ts`:

- DAX phải tương đương query frontend;
- output aliases phải giống tuyệt đối;
- params/defaults phải giống;
- `TREATAS` phải đi vào cùng table/column;
- validator phải từ chối input invalid;
- không để unresolved placeholder.

Không sửa một bên bằng cách copy đại toàn bộ file còn lại nếu hai builder có
khác biệt về import hoặc runtime. So sánh contract và DAX sinh ra bằng test.

### 5.2 Route schema và dispatcher

Trong `backend/src/routes/dax.route.ts`, với query mới hoặc params mới:

1. import builder;
2. tạo/cập nhật Zod params schema;
3. đăng ký `queryId` trong `daxQueryRequestSchema`;
4. thêm/cập nhật case trong `buildRegisteredDaxQuery`;
5. truyền đủ params và filters;
6. thêm expected-column guard nếu query có contract đặc biệt quan trọng.

Thiếu bước 3 gây lỗi `Invalid discriminator value`. Thiếu bước 4 làm query
không dispatch được. Thiếu một filter có thể trả HTTP 200 nhưng sai phạm vi dữ
liệu.

### 5.3 Backend Power BI result contract

`backend/src/services/powerbi-query.ts` chuẩn hóa tên cột Power BI. Nếu route
dùng `assertPowerBiQueryResultColumns`, danh sách guard phải được cập nhật cùng
lúc với DAX.

Với query trả zero row, đừng suy luận rằng schema đúng chỉ vì request thành
công. Test ít nhất một filter/cycle có dữ liệu, hoặc dùng contract tabular có
`expectedColumns` khi phù hợp.

Registered response hiện suy ra `columns` từ keys trong các rows đã normalize.
Vì vậy query danh sách có zero row có thể không cung cấp đủ dữ kiện để guard
schema. Query dạng `ROW` như overview luôn có một row và phù hợp với
`assertPowerBiQueryResultColumns`; query danh sách như nhân viên phải cho phép
empty state hợp lệ và được schema-test bằng một request có dữ liệu.

### 5.4 Backend tests và self-check

Cập nhật:

- `backend/src/routes/dax.route.node-test.ts` cho schema, dispatch, aliases,
  measures và filters;
- `backend/scripts/self-check-*.mjs` cho những query đã có self-check;
- test service nếu thay đổi normalization, tabular response hoặc schema guard.

## Bước 6 — Đồng bộ frontend backend client

Trong `src/lib/backend-semantic-model-client.ts`:

1. cập nhật params interface;
2. thêm/cập nhật entry trong `BackendSemanticQueryParamsById`;
3. thêm/cập nhật `expectedColumnsByQuery`;
4. giữ đúng alias và thứ tự contract;
5. cập nhật `src/lib/backend-semantic-model-client.spec.ts`.

Ví dụ, khi overview tăng từ 16 lên 18 cột, cả DAX backend và
`expectedColumnsByQuery["overview-kpi-summary"]` phải cùng có `actual`,
`target`. Chỉ sửa client sẽ tạo lỗi `Backend thiếu cột actual` khi frontend mới
gọi backend cũ.

## Bước 7 — Đồng bộ hook/parser/consumer

Hook gọi `useSemanticModelQuery` phải truyền đồng thời:

- `connection`, `query`, `columnMetadata` cho direct/generic path;
- `backendRequest` đúng `queryId` và đủ params cho registered path;
- `enabled` để không query trước khi cycle/dimension/filter sẵn sàng.

Parser phải kiểm tra nghiêm ngặt:

- required columns;
- type và nullable values;
- duplicate identity nếu grain yêu cầu unique;
- BLANK (`null`) khác với 0;
- stale request không ghi đè kết quả của params mới.

Không fallback sang mock khi contract Semantic lỗi. Error phải trả trạng thái
error/rows rỗng và cho phép retry.

## Bước 8 — Validation bắt buộc trước deploy

Chọn targeted tests theo query vừa sửa, sau đó chạy bộ nền:

```bash
npx tsc -b --pretty false
npx vitest run \
  src/queries/<query>.spec.ts \
  src/path/to/<hook>.spec.ts \
  src/lib/backend-semantic-model-client.spec.ts
npx eslint <changed-frontend-files>
```

```bash
cd backend
npm run typecheck
npm test
npm run build
node scripts/self-check-kpi-query.mjs
cd ..
```

Chỉ chạy self-check tương ứng với domain đã đổi. Nếu đổi query khác, dùng hoặc
tạo script phù hợp thay vì mặc định cho rằng KPI self-check đã bao phủ nó.

Cuối cùng:

```bash
npm run build
```

Ngoài việc test chuỗi DAX, phải chạy DAX thật bằng Fabric CLI. Unit test chỉ
chứng minh string/contract được tạo đúng; nó không chứng minh measure tồn tại
trong Semantic Model.

## Bước 9 — Thứ tự deploy an toàn

Trước deploy:

```bash
git diff --check
git diff --stat
git show --stat --oneline HEAD
git ls-remote origin refs/heads/main
```

Xác nhận file cần deploy đã nằm trong commit và SHA remote đúng SHA dự kiến.
Với Render, kiểm tra service đang build đúng root directory `backend` cùng
build/start command tương ứng. Không deploy nhầm service `backend_api`; đó là
một backend khác và không chứa registered DAX route này.

### Thay đổi cộng thêm cột/queryId/params

1. Deploy Semantic Model trước.
2. Deploy backend có DAX builder, route và cột mới.
3. Smoke-test backend live.
4. Chỉ sau khi backend live đạt contract mới, deploy frontend mới.

Backend registered có thể trả thêm cột mà frontend cũ chưa dùng. Chiều ngược
lại không an toàn: frontend mới đòi cột/queryId mà backend cũ chưa có sẽ lỗi
ngay.

### Rename hoặc xóa cột

Dùng rollout tương thích nhiều bước:

1. Backend/DAX tạm trả cả alias cũ và alias mới.
2. Deploy frontend chuyển sang alias mới.
3. Xác nhận không còn consumer alias cũ.
4. Ở release sau mới xóa alias cũ khỏi frontend và backend.

Không rename/xóa đồng thời trong một release nếu frontend và backend được
deploy độc lập.

## Bước 10 — Smoke-test backend live

Health check:

```bash
curl -i -sS --max-time 30 \
  https://<backend-host>/api/health
```

Kiểm tra kết nối thật đến Semantic Model:

```bash
curl -i -sS --max-time 60 \
  https://<backend-host>/api/health/semantic-model
```

Registered query:

```bash
curl -i -sS --max-time 60 \
  -X POST https://<backend-host>/api/dax/query \
  -H 'Content-Type: application/json' \
  --data '{
    "queryId": "<query-id>",
    "params": {
      "cycleKey": 202608,
      "kpiId": 1,
      "region": "all",
      "amm": "all",
      "supervisor": "all"
    }
  }'
```

Không chỉ kiểm tra HTTP 200. Phải xác nhận:

- `data.columns` đúng số lượng, alias và thứ tự mong đợi;
- row có đủ keys;
- actual values hợp lý;
- filtered request trả đúng phạm vi;
- `meta.queryId` và `rowCount` hợp lý.

Probe ít nhất:

1. tất cả filter là `all`;
2. một Region encoded thật;
3. một AMM hoặc Supervisor encoded thật nếu query hỗ trợ;
4. một cycle/KPI có dữ liệu;
5. một trường hợp empty hợp lệ.

Nếu vừa push mà endpoint vẫn trả contract cũ, kiểm tra commit SHA mà platform
đang deploy. Redeploy cùng commit cũ không thể tạo ra queryId/cột mới.

## Chẩn đoán lỗi nhanh

| Lỗi | Nguyên nhân thường gặp | Cách kiểm tra |
|---|---|---|
| `Backend thiếu cột X` | Frontend expected columns mới hơn backend live, alias sai hoặc DAX không trả X | So sánh `expectedColumnsByQuery`, response live và DAX builder BE |
| `Invalid discriminator value` | Backend live chưa đăng ký queryId | Kiểm tra Zod union, dispatcher và SHA deploy |
| `POWERBI_SCHEMA_MISMATCH` | Power BI response thiếu alias đã khai báo | Chạy DAX thật; kiểm tra model measure, alias và guard |
| `Backend trả columns không khớp columnMetadata` | Generic expected columns khác tên/thứ tự Power BI trả về | So sánh exact `columnMetadata` keys và response |
| `GENERIC_DAX_DISABLED` | Frontend dùng generic nhưng backend chưa bật | Đồng bộ environment hoặc quay về registered mode |
| Power BI báo không tìm thấy measure/column | Semantic Model chưa publish hoặc tên DAX sai | Query trực tiếp đúng workspace/dataset bằng Fabric CLI |
| HTTP 200 nhưng dữ liệu sai phạm vi | Thiếu/sai TREATAS hoặc dùng label thay ID | Kiểm tra params encoded và DAX filter columns |
| Empty bị hiểu là lỗi schema | Query không có row để suy ra columns | Test cycle có dữ liệu và giữ schema contract riêng |

Hai log sau thường không liên quan contract DAX/backend:

- thông báo tải React DevTools;
- `Unchecked runtime.lastError` từ browser extension.

## Rollback

1. Không rollback Semantic Model nếu frontend/backend mới đã phụ thuộc measure
   mới mà chưa có compatibility alias.
2. Với registered mode, rollback frontend về contract cũ trước nếu backend mới
   vẫn tương thích ngược.
3. Giữ queryId cũ trong ít nhất một release nếu có consumer đang dùng.
4. Sau rollback, probe endpoint live; không dựa vào trạng thái “deploy
   successful” của platform.
5. Ghi rõ SHA frontend, SHA backend và phiên bản Semantic Model đã rollback.

## Definition of Done

- [ ] Semantic Model đã publish/refresh.
- [ ] DAX chạy thật thành công trên đúng model.
- [ ] Exact aliases, types, nullability và grain đã được ghi nhận.
- [ ] Frontend `.dax`, factory, type và `columnMetadata` đã đồng bộ.
- [ ] Backend DAX builder tạo cùng contract.
- [ ] Zod schema và dispatcher nhận đúng queryId/params.
- [ ] Backend client expected columns khớp tuyệt đối.
- [ ] Hook truyền đủ cycle/KPI/Region/AMM/Supervisor nếu áp dụng.
- [ ] Parser có test null, invalid type, duplicate key và empty.
- [ ] Query tests, client tests, backend tests và builds đều pass.
- [ ] Backend được deploy trước frontend cho additive change.
- [ ] Live response đã được kiểm tra cột, row và filter.
- [ ] SHA deploy đã được xác nhận, không chỉ dựa vào nút redeploy.
- [ ] Source-of-truth của domain đã được cập nhật theo contract mới.
- [ ] Không có mock fallback che giấu lỗi Semantic/backend.

## Các anti-pattern cần tránh

- Chỉ sửa `src/queries/*.dax` rồi cho rằng backend tự dùng file đó.
- Chỉ thêm cột vào `expectedColumnsByQuery` trước khi backend live trả cột đó.
- Copy contract 16 cột ở backend trong khi direct Fabric đã lên 18 cột.
- Thêm queryId ở frontend nhưng quên Zod union hoặc switch backend.
- Kiểm tra mỗi HTTP status mà không đọc `data.columns`.
- Match filter bằng label hoặc so sánh chuỗi như `North/NORTH` thay vì encoded
  ID.
- Xem BLANK như 0 hoặc tự tính lại measure ở frontend mà không có contract.
- Dùng mock fallback làm lỗi backend biến mất trên UI.
- Push một working tree lớn chứa thay đổi không liên quan chỉ để deploy một
  backend hotfix.
