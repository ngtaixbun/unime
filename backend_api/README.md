# Rayfin Backend API

Backend proxy đứng giữa frontend Rayfin và Power BI / Fabric semantic model. Cung cấp một endpoint `POST /api/dax/query` nhận DAX query từ frontend, authenticate với Microsoft Entra ID (Service Principal), execute DAX qua Power BI REST API `executeQueries`, và trả JSON về React.

**Lý do cần backend:** Microsoft Fabric semantic models không thể query trực tiếp từ Rayfin khi app chạy ngoài Fabric portal — *"Can't open this app outside Fabric"*. Backend là cầu nối để chạy DAX server-side.

## Stack

| Mục | Công nghệ |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Auth | `@azure/msal-node` (client_credentials / app-only flow) |
| HTTP client | `axios` |
| DAX execution | Power BI REST `POST /datasets/{id}/executeQueries` |
| Validation | `zod` (env validation) |
| Container | Docker (multi-stage build) |

## Setup

### 1. Chuẩn bị Microsoft Entra ID

Trước khi chạy backend, cần:

1. **Tạo App Registration** trong Azure Portal (portal.azure.com):
   - Tên: `Rayfin Backend` (hoặc tùy ý)
   - Lấy `Application (client) ID` → `CLIENT_ID`
   - Lấy `Directory (tenant) ID` → `TENANT_ID`
   - Tạo **Client Secret** trong "Certificates & secrets" → `CLIENT_SECRET`

2. **Cấp quyền**:
   - Vào Fabric portal → Workspace → Manage access
   - Thêm Service Principal với role **Member** (không phải Contributor)

3. **Bật Tenant Settings** (cần admin):
   - Fabric Admin Portal → Tenant settings → Integration settings
   - **"Dataset Execute Queries REST API"** = ON

### 2. Cấu hình môi trường

```bash
cp .env.example .env
# Sửa .env với giá trị thật
```

### 3. Chạy local (không Docker)

```bash
npm install
npm run dev
# Server chạy http://localhost:3000
```

### 4. Chạy với Docker

```bash
docker build -t rayfin-backend .
docker run --rm -p 3000:3000 --env-file .env rayfin-backend
```

## Endpoints

### `GET /` — Health check

```bash
curl http://localhost:3000/
# → { "success": true, "message": "...", "timestamp": "..." }
```

### `GET /api/auth/token` — DEV-ONLY: Test MSAL token

```bash
curl http://localhost:3000/api/auth/token
# → { "success": true, "tokenLength": 1234, ... }
```

Không khả dụng khi `NODE_ENV=production`.

### `POST /api/dax/query` — Execute DAX

```bash
curl -X POST http://localhost:3000/api/dax/query \
  -H "Content-Type: application/json" \
  -d '{"dax":"EVALUATE ROW(\"x\", COUNTROWS(Data))"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "columns": ["x"],
    "rows": [{ "x": 1234 }]
  },
  "meta": { "rowCount": 1 }
}
```

Tên cột được normalize — bỏ prefix `Data[]`, `Date[]` (ví dụ `Data[AMM]` → `AMM`).

## Frontend integration

Frontend (Rayfin app) gọi backend thay vì Fabric SDK trực tiếp:

1. Trong `frontend/.env.development.local`: `VITE_USE_BACKEND=true`
2. Vite proxy ở `vite.config.ts`: `/api` → `http://localhost:3000`
3. Hook `useSemanticModelQuery` tự động branch theo env var

## Troubleshooting

| Lỗi | Nguyên nhân |
|---|---|
| `401 Unauthorized` từ Fabric | Tenant setting chưa bật, hoặc SP hết hạn |
| `403 Forbidden` | SP chưa có role Member trong workspace, hoặc thiếu permission `Dataset.Read.All` |
| `404 Not Found` | `WORKSPACE_ID` / `SEMANTIC_MODEL_ID` sai |
| Health check OK nhưng `/api/dax/query` fail | Token OK nhưng Fabric REST endpoint bị block — bật tenant setting |

## Architecture

```
Browser → React (Rayfin)
   │
   └─→ POST /api/dax/query { dax }
            │
            └─→ Backend (Express :3000)
                  ├─ msal-node: acquireTokenByClientCredential()
                  │    → Bearer token (Power BI scope)
                  ├─ axios POST /groups/{wsId}/datasets/{dsId}/executeQueries
                  └─→ Power BI REST API
                              └─→ Semantic Model "merchandising"
                                          └─→ JSON rows → normalize → Response
```

## Out of scope

- Public deploy (cần HTTPS + reverse proxy + secret manager — sẽ làm với Cloudflare Tunnel hoặc Azure Container Apps khi cần)
- Backend auth cho incoming requests (hiện đang open cho LAN dev)
- Cache layer
- Rate limiting

## Production deployment

Backend có thể deploy lên nhiều hosting providers, miễn phí. Đã chuẩn bị sẵn config cho 2 platform phổ biến nhất:

### Option A: Railway.app (recommended cho free)

**Ưu điểm:** $5 free credit/tháng (~500h runtime), always-on, không sleep, auto HTTPS, env injection sạch.

**Deploy:**

1. Push code lên GitHub (KHÔNG commit file `.env`!).
2. Vào [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → chọn repo.
3. Railway tự detect `backend_api/railway.json` và dùng Dockerfile để build.
4. Variables tab → set các env từ `.env.production.example`:
   ```
   NODE_ENV=production
   PORT=3000
   TENANT_ID=d21fc486-...
   CLIENT_ID=beac8b43-...
   CLIENT_SECRET=...
   WORKSPACE_ID=2cfe3c70-...
   SEMANTIC_MODEL_ID=ed1b1758-...
   ```
5. Sau khi build xong → Settings → Generate Domain → có URL dạng `https://<app>.up.railway.app`
6. Update `.env.production` ở frontend:
   ```
   VITE_API_BASE_URL=https://<app>.up.railway.app/api
   ```

### Option B: Render.com (nếu không thích Railway)

**Ưu điểm:** 750 runtime hours/tháng free. **Nhược điểm:** free tier **sleep sau 15 phút không có traffic** → request đầu tiên sau khi sleep mất ~30s.

**Deploy qua Blueprint (render.yaml):**

1. Push code lên GitHub.
2. Vào [dashboard.render.com](https://dashboard.render.com) → New → Blueprint → chọn repo.
3. Render detect `backend_api/render.yaml` → tạo Web Service tự động.
4. Set env vars còn lại (`TENANT_ID`, etc.) trên Dashboard (các key `sync: false`).
5. Settings của service → set Health Check Path = `/`.
6. Sau khi deploy → URL dạng `https://<app>.onrender.com`
7. Update `.env.production` ở frontend.

**Deploy manual:**

1. Dashboard → New → Web Service
2. Runtime: Docker
3. Dockerfile path: `backend_api/Dockerfile`
4. Docker context: `backend_api`
5. Health check path: `/`

### Verify deployment

```bash
# Health check
curl https://<your-domain>/
# → { "success": true, ... }

# DAX proxy
curl -X POST https://<your-domain>/api/dax/query \
  -H "Content-Type: application/json" \
  -d '{"dax":"EVALUATE VALUES(Data[AMM])"}'
# → { "success": true, "data": { "columns": ["AMM"], "rows": [...] } }
```

### Frontend integration (sau khi backend deploy)

```bash
# Trong root project
# Sửa .env.production — đặt VITE_API_BASE_URL = URL public của backend
npm run build
npx rayfin up   # deploy lên Fabric portal
```

App giờ chạy public: `https://merry-grass-d45d0490cf-southeastasia.webapp.fabricapps.net` ← gọi qua `https://<app>.up.railway.app/api/dax/query` (hoặc Render URL) → Fabric semantic model.

### Custom origins (CORS)

Nếu cần allow thêm origin (custom domain, staging, etc.):

```bash
# Trên Railway/Render Variables, set
CORS_ORIGIN=https://my-staging.example.com,https://my-prod.example.com
```

Backend sẽ merge vào whitelist.

### Backup option nếu không muốn cloud hosting: Cloudflare Tunnel

Có thể tạm thời chạy Cloudflare Quick Tunnel từ máy local — không cần account cloud nào:

```bash
# 1. Tải cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
# 2. Chạy
cloudflared tunnel --url http://localhost:3000
# → Cho URL random kiểu https://xxx.trycloudflare.com

# 3. Update .env.production với URL đó
# 4. Rebuild + rayfin up
```

Nhược điểm: URL đổi mỗi lần restart, máy phải bật.
