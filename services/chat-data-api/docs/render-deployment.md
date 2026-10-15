# Chat Data API — Render deployment and Entra setup (STEP 04B.5)

Status: **prepared and clean-build verified locally; Entra registrations live-validated; not deployed.**

## 1. What a cloud build needs

The build regenerates `src/generated/query-capabilities.generated.ts` from the
original Unime sources, so the deployed Git revision must contain:

```
services/chat-data-api/**            (without node_modules, dist, .env, src/generated/*)
src/queries/market.ts
src/queries/market.dax
src/queries/market-query-builder.ts
src/queries/org-filter.ts
src/queries/query-context.ts
src/lib/access-session.ts
```

On 2026-10-15, `services/` and five of those six files were untracked, and
`org-filter.ts` differed from `HEAD`. The build fails closed (exit 1) when a
source is missing. A clean-room build from exactly this file set reproduced an
identical artifact (`sourceHash 3e0b0b3d863104323f0c8198d3e978e20dfd5f6fe9e3c122551ebbbc735439ef`).

Recommended: an isolated deploy branch built in a separate worktree, so existing
uncommitted work in the main checkout is untouched (needs owner approval to push):

```bash
cd /Users/nguyenngoctai/Documents/Unime
git fetch origin
git worktree add -b deploy/chat-data-api ../unime-chat-deploy origin/main
mkdir -p ../unime-chat-deploy/services
rsync -a --exclude node_modules --exclude dist --exclude .env --exclude 'src/generated/*' \
  services/chat-data-api ../unime-chat-deploy/services/
for f in src/queries/market.ts src/queries/market.dax src/queries/market-query-builder.ts \
         src/queries/org-filter.ts src/queries/query-context.ts src/lib/access-session.ts; do
  cp "$f" "../unime-chat-deploy/$f"
done
cd ../unime-chat-deploy
mkdir -p services/chat-data-api/src/generated
npm --prefix services/chat-data-api ci && npm --prefix services/chat-data-api run build && npm --prefix services/chat-data-api test
git restore --staged . 2>/dev/null; git add services/chat-data-api src/queries src/lib/access-session.ts
git reset -q services/chat-data-api/src/generated
git commit -m "chore(chat-data-api): isolated Render deployment for Hubi public POC"
git push -u origin deploy/chat-data-api
```

## 2. Render service

Blueprint: [`services/chat-data-api/render.yaml`](../render.yaml) (service
`unime-chat-data-api`; the repository-root `render.yaml` for the Generic DAX
Gateway is not touched). In Render: **New → Blueprint**, repo
`ngtaixbun/unime`, branch `deploy/chat-data-api`, Blueprint file
`services/chat-data-api/render.yaml`. If the account offers no custom Blueprint
path, create a **Web Service** manually with the same values:

| Setting | Value |
|---|---|
| Root directory | *(empty — repo root)* |
| Build | `npm --prefix services/chat-data-api ci && npm --prefix services/chat-data-api run build` |
| Start | `npm --prefix services/chat-data-api start` |
| Health check | `/api/health` |
| Instance | Starter (paid, always on), 1 instance, auto-deploy off |
| Env | as listed in `render.yaml`; secrets entered in the dashboard only |

Render terminates TLS and sets `PORT`; `CHAT_HOST=0.0.0.0` is accepted only with
`NODE_ENV=production`. `GET /api/health` is the only route served without
HTTPS (Render's internal probe); every other route returns `HTTPS_REQUIRED`
unless the trusted proxy reports HTTPS.

Post-deploy checks (no Power BI load):

```bash
API=https://<render-host>
curl -s -w ' %{http_code}\n' $API/api/health                                   # 200
curl -s -w ' %{http_code}\n' -X POST -H 'Content-Type: application/json' \
  -d '{"apiVersion":"1","questionId":"coverage_store","parameters":{"cycleKey":"202610","region":"ALL"}}' \
  $API/api/chat/v1/query                                                       # 401
```

## 3. Microsoft Entra (target tenant)

Both registrations were created and validated with a real token on
2026-10-15 (STEP 04B.7). The role assignment in step 3.4 succeeded with the
signed-in user as owner of both applications; tenants that restrict this need
**Cloud Application Administrator**, **Application Administrator** or
**Global Administrator**. The commands below are kept as the reference
procedure; do not rerun them against the existing registrations.

```bash
TENANT=<tenant-id>   # do not commit the real value
cat > /tmp/chat-roles.json <<EOF
[{"allowedMemberTypes":["Application"],"displayName":"coverage_store:nationwide:read","description":"Read Nationwide store coverage","isEnabled":true,"value":"coverage_store:nationwide:read","id":"$(uuidgen | tr A-Z a-z)"},
 {"allowedMemberTypes":["Application"],"displayName":"coverage_employee:nationwide:read","description":"Read Nationwide employee coverage","isEnabled":true,"value":"coverage_employee:nationwide:read","id":"$(uuidgen | tr A-Z a-z)"}]
EOF
# 3.1 Unime Chat Data API (single tenant, v2 tokens, explicit App ID URI)
API_APP=$(az ad app create --display-name "Unime Chat Data API" --sign-in-audience AzureADMyOrg \
  --app-roles @/tmp/chat-roles.json --query appId -o tsv)
az ad app update --id $API_APP --identifier-uris "api://$API_APP"
az ad app update --id $API_APP --set api.requestedAccessTokenVersion=2
API_SP=$(az ad sp create --id $API_APP --query id -o tsv)
# 3.2 Hubi Backend (confidential client)
HUBI_APP=$(az ad app create --display-name "Hubi Backend" --sign-in-audience AzureADMyOrg --query appId -o tsv)
HUBI_SP=$(az ad sp create --id $HUBI_APP --query id -o tsv)
# 3.3 Secret straight into Vercel Production, never printed
az ad app credential reset --id $HUBI_APP --display-name hubi-vercel-prod --years 1 --query password -o tsv \
  | vercel env add HUBI_ENTRA_CLIENT_SECRET production --sensitive
# 3.4 Admin consent = application role assignments (administrator)
for ROLE in coverage_store:nationwide:read coverage_employee:nationwide:read; do
  ROLE_ID=$(az ad app show --id $API_APP --query "appRoles[?value=='$ROLE'].id" -o tsv)
  az rest --method POST --url "https://graph.microsoft.com/v1.0/servicePrincipals/$HUBI_SP/appRoleAssignments" \
    --body "{\"principalId\":\"$HUBI_SP\",\"resourceId\":\"$API_SP\",\"appRoleId\":\"$ROLE_ID\"}"
done
echo "CHAT_ENTRA_API_AUDIENCE=$API_APP  CHAT_ENTRA_ALLOWED_CLIENT_IDS=$HUBI_APP"   # GUID, not api://
echo "HUBI_ENTRA_CLIENT_ID=$HUBI_APP  HUBI_ENTRA_API_SCOPE=api://$API_APP/.default"
```

### Values that must match a real token

| Variable | Value | Why |
|---|---|---|
| `CHAT_ENTRA_TENANT_ID` | tenant GUID | issuer `https://login.microsoftonline.com/<tenant>/v2.0` and JWKS |
| `CHAT_ENTRA_API_AUDIENCE` | **Chat Data API client ID GUID** | with `requestedAccessTokenVersion=2` the token `aud` is the client ID, never the `api://` URI |
| `CHAT_ENTRA_ALLOWED_CLIENT_IDS` | Hubi Backend client ID GUID | compared with `azp` |
| `CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS` | `5700` | Entra back-dates `iat` ~5 min; observed `exp − iat = 3900 s`, app tokens can last up to 90 min. With the 3600 default every real token is rejected (401). |
| Hubi `HUBI_ENTRA_API_SCOPE` | `api://<Chat Data API client ID>/.default` | the scope (not the audience) uses the `api://` URI |

Signature (RS256 via tenant JWKS), issuer, audience, `exp`/`nbf`, `ver=2.0`,
`azp` allowlist and role checks are unchanged; only the maximum lifetime is
raised. Live validation (local, production mode, semantic disabled): valid
token → 501 for both questions; no, malformed, tampered, wrong-audience or
non-allowlisted token → 401.

The Power BI service principal (`CHAT_POWERBI_*`) stays separate and is never
given to Hubi. For the 403 check, use a third app with no role assignment that
is temporarily allowlisted, then remove it from `CHAT_ENTRA_ALLOWED_CLIENT_IDS`.
