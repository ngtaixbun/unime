# Unime Chat Data API — STEP 02

Standalone Node.js, TypeScript, and Express service for the allowlisted `coverage_store` and `coverage_employee` chatbot questions. Both reuse the same existing `market.summary` capability. Semantic execution is disabled by default and can only be enabled for local development with fixed server-side Power BI configuration.

Queries are generated at build time from existing Unime query factories. The Chat service contains no chatbot-specific DAX source. See [Query Reuse Architecture](docs/query-reuse-architecture.md).

Production trusted-application authentication, Entra registration, permission
mapping and operational prerequisites are documented in
[Application Authentication](docs/application-authentication.md).

## Local setup (PowerShell)

```powershell
Set-Location services/chat-data-api
npm install
Copy-Item .env.example .env
$credential = -join ((1..32) | ForEach-Object { ('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')[(Get-Random -Maximum 62)] })
(Get-Content .env) -replace '^CHAT_DATA_API_TEST_CREDENTIAL=.*$', "CHAT_DATA_API_TEST_CREDENTIAL=$credential" | Set-Content .env
npm run dev
```

`npm run dev`, `npm run typecheck`, `npm test`, and `npm run build` regenerate the allowlisted query-capability artifact from the current Unime sources before continuing.

Edit the untracked `.env` and provide the existing approved `CHAT_POWERBI_*` values. Keep `CHAT_SEMANTIC_ENABLED=false` until live local verification is required.

The server listens on `127.0.0.1:3101` by default. `CHAT_HOST` may name a non-loopback address only when `NODE_ENV=production`; see [Render deployment](docs/render-deployment.md). The test credential is accepted only when `NODE_ENV` is `development` or `test`; production semantic execution is rejected during environment validation. Do not use a `VITE_*` variable or commit `.env`.

## Test request (PowerShell)

In the same PowerShell session where `$credential` was generated:

```powershell
$headers = @{ Authorization = "Bearer $credential"; 'Content-Type' = 'application/json' }
$body = @{ apiVersion = '1'; questionId = 'coverage_store'; requestId = 'example-request-1'; parameters = @{ cycleKey = '202610'; region = 'ALL' } } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3101/api/chat/v1/query' -Headers $headers -Body $body
} catch {
  [int]$_.Exception.Response.StatusCode
  $_.ErrorDetails.Message
}
```

With `CHAT_SEMANTIC_ENABLED=false`, expected status is `501 Not Implemented`:

```json
{
  "apiVersion": "1",
  "questionId": "coverage_store",
  "requestId": "example-request-1",
  "error": {
    "code": "SEMANTIC_NOT_CONFIGURED",
    "message": "Power BI integration is not configured yet."
  }
}
```

Health check: `GET http://127.0.0.1:3101/api/health`.

## Enable and verify semantic execution locally (PowerShell)

Stop the service, set these values in the local `.env` without printing them, then restart it:

```dotenv
NODE_ENV=development
PORT=3101
CHAT_DATA_API_TEST_CREDENTIAL=<local-random-credential>
CHAT_SEMANTIC_ENABLED=true
CHAT_POWERBI_TENANT_ID=<existing-approved-tenant-id>
CHAT_POWERBI_CLIENT_ID=<existing-approved-client-id>
CHAT_POWERBI_CLIENT_SECRET=<existing-approved-client-secret>
CHAT_POWERBI_WORKSPACE_ID=<existing-approved-workspace-id>
CHAT_POWERBI_SEMANTIC_MODEL_ID=<existing-approved-semantic-model-id>
CHAT_POWERBI_TIMEOUT_MS=60000
CHAT_POWERBI_MAX_RESPONSE_BYTES=262144
```

Start the service:

```powershell
Set-Location services/chat-data-api
npm run dev
```

From another PowerShell window, set `$credential` to the same local test credential without printing it, then run:

```powershell
$credential = Read-Host 'Local Chat API credential'
$headers = @{ Authorization = "Bearer $credential"; 'Content-Type' = 'application/json' }
$body = @{
  apiVersion = '1'
  questionId = 'coverage_store'
  requestId = 'coverage-live-202610'
  parameters = @{ cycleKey = '202610'; region = 'ALL' }
} | ConvertTo-Json

try {
  $result = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3101/api/chat/v1/query' -Headers $headers -Body $body
  $result | ConvertTo-Json -Depth 5
  $result.data.actual
  $result.data.plan
  $result.data.coveragePercent
} catch {
  [int]$_.Exception.Response.StatusCode
  $_.ErrorDetails.Message
}
```

To disable semantics again, stop the service, set `CHAT_SEMANTIC_ENABLED=false` in `.env`, and restart. When disabled, no MSAL client is constructed and no Power BI request is attempted.

## Verification

```powershell
npm run typecheck
npm test
npm run build
```

Production uses Microsoft Entra application tokens and never accepts the local
development credential. Production startup fails closed unless Entra, HTTPS,
semantic execution and operational safeguards are explicitly configured. No
production deployment is performed by this repository task.
