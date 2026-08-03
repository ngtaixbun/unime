# Unime Generic DAX Gateway

This service is an infrastructure-only gateway for one fixed Power BI workspace and Semantic Model. The frontend sends complete DAX and an optional expected-column contract. The gateway owns Service Principal authentication, Execute Queries transport, timeout, normalization, CORS, request IDs, health checks, and safe errors. It contains no business query registry or page-specific DAX.

## API

- `GET /api/health`
- `GET /api/health/semantic-model`
- `POST /api/dax/query` with `{ "dax": "EVALUATE ...", "expectedColumns": ["alias"] }`
- `POST /api/dax/batch` with `{ "queries": [{ "name": "overview", "dax": "EVALUATE ...", "expectedColumns": ["alias"] }] }`

Batch execution is all-or-nothing. A failed query returns a non-2xx error envelope with `failedQueryName`; it is never converted into an empty dataset.

## Environment

Required: `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `WORKSPACE_ID`, `SEMANTIC_MODEL_ID`.

Optional: `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `CORS_ORIGIN`, `POWERBI_TIMEOUT_MS`, `DAX_MAX_LENGTH_BYTES`, `BATCH_MAX_QUERIES`, `BATCH_CONCURRENCY`.

`CORS_ORIGINS` is a comma-separated exact-origin allowlist. The defaults include Vite on `localhost:5173`, `127.0.0.1:5173`, the known Fabric/Rayfin app origins, and `https://app.fabric.microsoft.com`. Requests without `Origin` are accepted for health monitors and server-to-server smoke tests. Secrets must only be configured in local ignored `.env` files or the Render dashboard.

## Local validation

```bash
npm ci
npm run typecheck
npm test
npm run build
node scripts/verify-greenfield.mjs
node scripts/smoke-local.mjs
```

## Render

- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Required environment: `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `WORKSPACE_ID`, `SEMANTIC_MODEL_ID`, `CORS_ORIGINS`, `NODE_ENV=production`

The server binds `process.env.PORT` on `0.0.0.0`.
