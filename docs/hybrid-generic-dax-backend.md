# Hybrid generic DAX backend

## Mục tiêu

Backend hỗ trợ song song hai cơ chế:

- `POST /api/dax/query`: cơ chế cũ dùng `queryId + params`. Giữ lại để rollback.
- `POST /api/dax/execute`: cơ chế generic nhận DAX và schema cột trực tiếp từ frontend.

Khi generic mode được bật, DAX, query factory và `columnMetadata` thuộc về frontend. Thêm KPI/query mới không cần đăng ký thêm `queryId`, viết DAX builder hoặc sửa router ở backend.

Backend vẫn chịu trách nhiệm giữ Power BI service principal, lấy access token, gọi Power BI Execute Queries API, kiểm tra giới hạn request và chuẩn hóa response.

## Contract generic

Request:

```json
{
  "query": "EVALUATE ROW(\"Value\", 1)",
  "expectedColumns": ["[Value]"]
}
```

Response thành công:

```json
{
  "success": true,
  "data": {
    "columns": ["[Value]"],
    "rows": [[1]]
  },
  "meta": {
    "rowCount": 1
  }
}
```

`expectedColumns` phải lấy từ key của `columnMetadata`. Backend giữ nguyên tên và thứ tự cột, kể cả khi query trả về zero row. Nếu Power BI thiếu một cột đã khai báo, backend trả `POWERBI_SCHEMA_MISMATCH`.

## Cấu hình

Frontend:

```dotenv
VITE_DATA_SOURCE=backend
VITE_BACKEND_QUERY_MODE=generic
VITE_API_BASE_URL=http://localhost:3000
```

Giá trị mặc định của `VITE_BACKEND_QUERY_MODE` là `registered`, vì vậy có thể rollback mà không đổi code:

```dotenv
VITE_BACKEND_QUERY_MODE=registered
```

Backend local hoặc staging:

```dotenv
GENERIC_DAX_ENABLED=true
DAX_MAX_LENGTH_BYTES=64000
DAX_MAX_EXPECTED_COLUMNS=128
```

Nếu `GENERIC_DAX_ENABLED=false`, `/api/dax/execute` trả `404 GENERIC_DAX_DISABLED`; `/api/dax/query` vẫn hoạt động.

## Điều kiện để một thay đổi chỉ nằm ở frontend

Một KPI/query mới không cần đổi backend khi:

1. DAX nằm trong file `.dax` của frontend.
2. Factory trả đủ `connection`, `query` và `columnMetadata`.
3. Component/hook truyền cả `query` và `columnMetadata` vào `useSemanticModelQuery`.
4. DAX chỉ truy cập semantic model mà service principal hiện tại đã được cấp quyền.
5. Request không vượt giới hạn generic endpoint.

Backend vẫn phải thay đổi khi đổi cơ chế authentication/authorization, semantic model hoặc tenant, giới hạn vận hành, hay contract transport.

## Rollout an toàn

1. Deploy backend có `/api/dax/execute`, nhưng giữ `GENERIC_DAX_ENABLED=false`.
2. Hoàn thiện inbound authentication và authorization cho endpoint generic.
3. Bật generic ở một môi trường staging và chạy smoke test trên Fabric portal.
4. Bật `GENERIC_DAX_ENABLED=true` ở backend trước.
5. Deploy frontend với `VITE_BACKEND_QUERY_MODE=generic`.
6. Theo dõi tỷ lệ lỗi Power BI, `POWERBI_SCHEMA_MISMATCH`, timeout và request volume.
7. Nếu có sự cố, đổi frontend về `registered`; endpoint cũ không bị xóa.

## Ràng buộc production hiện tại

Generic DAX là một bề mặt thực thi có quyền của service principal. CORS, giới hạn request và việc ẩn secret khỏi frontend không thay thế xác thực người gọi.

Vì ứng dụng hiện chưa có inbound authentication được gắn vào Express backend, backend cố ý từ chối khởi động khi `NODE_ENV=production` cùng `GENERIC_DAX_ENABLED=true`. Không gỡ khóa này cho đến khi backend xác minh được danh tính người dùng/token và áp dụng authorization trước route `/api/dax/execute`.

Rayfin `OpaqueSession` phía browser không cung cấp bearer token thô để tự chuyển tiếp sang Express. Nếu chọn Rayfin cho bước bảo mật này, cần dùng luồng server/API được Rayfin hỗ trợ chính thức hoặc đặt endpoint sau một lớp gateway xác thực phù hợp.
