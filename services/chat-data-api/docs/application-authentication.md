# Trusted application authentication

The production Chat Data API accepts only Microsoft Entra ID v2 application
tokens obtained by the Hubi backend with the OAuth 2.0 client-credentials flow.
This identity is deliberately separate from the service principal used by this
service to query Power BI.

## Entra registration

1. Register a single-tenant **Unime Chat Data API** application.
2. Expose its Application ID URI and use that exact value as
   `CHAT_ENTRA_API_AUDIENCE`.
3. Define these application roles with **Allowed member types: Applications**:
   - `coverage_store:nationwide:read`
   - `coverage_employee:nationwide:read`
4. Register the **Hubi Backend** as a separate confidential application.
5. Grant only the required Chat Data API application roles to Hubi and grant
   tenant admin consent.
6. Configure Hubi to request `<Application-ID-URI>/.default` through the
   client-credentials flow. Prefer a managed workload identity or certificate;
   if a client secret is unavoidable, keep it in the deployment secret manager.
7. Add Hubi's application/client ID to `CHAT_ENTRA_ALLOWED_CLIENT_IDS`.

The API derives the issuer and JWKS endpoint from `CHAT_ENTRA_TENANT_ID`. It
accepts only RS256 tokens with the exact v2 issuer, exact audience, valid
lifetime, an allowlisted `azp`, and a recognized `roles` value. Remote JWKS are
cached with bounded refresh/cooldown/timeout settings and refresh safely on key
rotation. Headers, request parameters and unverified claims never grant access.

Live Entra behavior remains unverified until approved registrations, role grants
and admin consent exist. Controlled RSA/JWKS fixtures cover the verifier locally.

## Server environment

Production requires all of the following in server-side secret/config storage:

- `NODE_ENV=production`
- `CHAT_ENTRA_TENANT_ID`
- `CHAT_ENTRA_API_AUDIENCE`
- `CHAT_ENTRA_ALLOWED_CLIENT_IDS` (comma-separated UUIDs)
- `CHAT_SEMANTIC_ENABLED=true` and all existing `CHAT_POWERBI_*` variables
- `CHAT_REQUIRE_HTTPS=true`
- Explicit rate, concurrency, queue, request-timeout and response-size settings
  documented in `.env.example`

`CHAT_DATA_API_TEST_CREDENTIAL` is rejected in production. Development and test
continue to accept it and map the trusted local client to both MVP permissions.

## Authorization policy

| Question | Required application role | Scope | Region |
|---|---|---|---|
| `coverage_store` | `coverage_store:nationwide:read` | `NATIONWIDE` | `ALL` |
| `coverage_employee` | `coverage_employee:nationwide:read` | `NATIONWIDE` | `ALL` |

Authorization occurs before semantic execution. The strict request contract
rejects drill-down fields, unknown questions, raw DAX and workspace/model
overrides. Both authorized questions still resolve to the generated
`market.summary` capability.

## Operational boundary

The built-in rate limiter and semantic concurrency gate are process-local. They
protect one instance only. A multi-instance deployment must add an authenticated
API gateway/shared rate-limit store and distributed concurrency coordination;
do not add the per-instance limits together and call them global protection.

Terminate TLS at a trusted private ingress, set the exact trusted proxy hop
count, restrict network access to the Hubi backend, and keep the service itself
off the public internet. Configure centralized secret management, monitoring,
alerting and retention for structured audit events. Audit records intentionally
exclude bearer tokens, secrets, raw DAX, request bodies and semantic values.
