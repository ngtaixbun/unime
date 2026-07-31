# Overview backend CORS incident

## Summary

On 2026-07-28, Overview loaded from `http://localhost:5174` failed before any
DAX request reached the route handler. The browser reported:

```text
Access to fetch at
https://unime-backend.onrender.com/api/dax/query
from origin http://localhost:5174 has been blocked by CORS policy.

Failed to fetch
```

This was a CORS configuration failure, not a DAX, Power BI authentication,
query-schema or Overview rendering failure.

## Impact

The first `dim-date` request could not complete, so Overview had no report
cycle. KPI summary, KPI trend and dependent filter-option requests could not
start or complete. The page surfaced its error state and retry action.

## Request path

Original failing path:

```text
OverviewPage
→ useDimDateData / useOverviewFilterOptions / useOverviewData
→ useSemanticModelQuery
→ executeBackendSemanticModelQuery
→ POST VITE_API_BASE_URL/api/dax/query
→ OPTIONS preflight
→ Render backend CORS middleware
```

`Content-Type: application/json` makes the browser preflight the POST.

Corrected local-development path:

```text
OverviewPage
→ POST /api/dax/query on the current localhost origin
→ Vite dev proxy
→ server-to-server POST to VITE_API_BASE_URL/api/dax/query
```

## Evidence

Read-only checks against the deployed Render service produced:

| Origin | OPTIONS result | CORS result |
| --- | --- | --- |
| `http://localhost:5173` | `204` | `Access-Control-Allow-Origin` present |
| `http://localhost:5174` | `403` | `CORS_ORIGIN_DENIED`; no allow-origin header |

The denied response body was:

```json
{
  "success": false,
  "error": {
    "code": "CORS_ORIGIN_DENIED",
    "message": "Origin không được phép: http://localhost:5174"
  }
}
```

The browser intentionally hid this response from application JavaScript and
reported the generic `TypeError: Failed to fetch`.

## Root cause

Three conditions combined:

1. `.env.development.local` selected the hosted backend through
   `VITE_API_BASE_URL=https://unime-backend.onrender.com`.
2. The backend compares the request origin against the exact,
   comma-separated `CORS_ORIGINS` allowlist.
3. Port 5173 was occupied, and Vite's default behavior silently selected
   port 5174. The deployed backend allowed 5173 but not 5174.

The Fabric local-network-access middleware was not the cause. `mode:
"no-cors"` is not a fix because it would produce an opaque response that the
application cannot read.

## Repository fix

The following changes define and enforce the corrected contract:

- `backend/src/config/env.ts` defaults to
  `http://localhost:5173,http://localhost:5174`;
- `backend/.env.example` documents the same exact allowlist;
- the current local `backend/.env` uses the same values;
- `vite.config.ts` uses `port: 5173`, `strictPort: true` and a same-origin
  `/api` development proxy to `VITE_API_BASE_URL`;
- the proxy removes the localhost `Origin` header from its server-to-server
  request, so active local port 5174 is no longer blocked by Render CORS;
- `src/lib/backend-semantic-model-client.ts` calls `/api/dax/query` in
  development and the configured absolute backend URL in production;
- `backend/src/config/cors.node-test.ts` exercises real OPTIONS requests for
  allowed 5173, allowed 5174, denied lookalike host and no-Origin requests;
- `src/lib/backend-semantic-model-client.ts` converts browser network/CORS
  rejection into an actionable message containing the backend URL, request
  origin and `CORS_ORIGINS` guidance;
- `src/lib/backend-semantic-model-client.spec.ts` covers that error contract.

The policy stays exact-origin. It does not use `*`, suffix matching or accept
hosts such as `localhost.evil.example`.

## Render deployment policy

The same-origin Vite proxy fixes local development without requiring a Render
configuration change. Direct browser calls from `http://localhost:5174` to the
current Render deployment remain denied.

For any production frontend that calls Render directly, add its exact deployed
origin to the Render service environment. If direct localhost access is still
required outside Vite's proxy, set:

```text
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Do not replace the list with `*`.

Restart or redeploy the service after saving the variable. If Render does not
currently define `CORS_ORIGINS`, deploying the updated backend code applies
the corrected default.

## Verification

Verify the active local development path:

```bash
curl --noproxy '*' -i \
  'http://localhost:5174/api/dax/query' \
  -H 'Content-Type: application/json' \
  --data '{"queryId":"dim-date","params":{}}'
```

Expected result is `HTTP 200` with the `dim-date` columns and rows.

To verify direct Render CORS after an optional Render restart/redeploy, run:

```bash
curl -i -X OPTIONS \
  'https://unime-backend.onrender.com/api/dax/query' \
  -H 'Origin: http://localhost:5174' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Expected result:

```text
HTTP 204
Access-Control-Allow-Origin: http://localhost:5174
Access-Control-Allow-Methods: GET,POST,OPTIONS
```

Then reload Overview and verify:

1. `dim-date` returns successfully.
2. KPI summary/trend requests no longer show a CORS preflight error.
3. Overview exits the error state.
4. Filter options and retry continue to work.
5. No `Failed to fetch` or CORS error appears in the browser console.

Automated commands:

```bash
cd backend
npm test
npm run typecheck
npm run build

cd ..
npx tsc -p tsconfig.json --noEmit
npm run lint
npm run test
npm run build
```

## Rollback

If 5174 must no longer be trusted:

1. Remove `http://localhost:5174` from the Render `CORS_ORIGINS` value.
2. Restart/redeploy the backend.
3. Run Vite only on an explicitly allowed origin.

Do not roll back by disabling CORS or using a wildcard origin.

## Status

- Root cause: confirmed.
- Repository configuration and regression protection: fixed.
- Local backend contract: verified with 3/3 CORS tests.
- Frontend regression suite: 28 files / 165 tests passed.
- Backend and frontend typechecks: passed.
- Backend and frontend production builds: passed.
- Root lint: passed.
- Deterministic-port guard: verified; with an existing process on 5173,
  `npm run dev` now stops with `Port 5173 is already in use` instead of
  silently starting on 5174.
- Active localhost 5174 proxy path: verified with a real
  `POST /api/dax/query`; returned `HTTP 200`, six `dim-date` columns and eight
  report-cycle rows.
- Current hosted workaround: the live Render preflight for
  `http://localhost:5173` returns `204` with the correct allow-origin header.
- Hosted Render service: healthy. Its direct-browser allowlist remains
  unchanged, but local Vite development no longer depends on that allowlist.
