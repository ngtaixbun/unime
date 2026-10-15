import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
  type JWTVerifyGetKey,
} from "jose";
import { applicationPermissions } from "../src/auth/permissions.js";
import { EntraApplicationTokenVerifier, type EntraTokenVerifierConfig } from "../src/auth/entra-token-verifier.js";
import { ApplicationTokenVerificationError } from "../src/auth/types.js";
import { getEnv } from "../src/config/env.js";
import { createAuthenticationMiddleware } from "../src/middleware/auth.middleware.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const allowedClientId = "22222222-2222-4222-8222-222222222222";
const unauthorizedClientId = "33333333-3333-4333-8333-333333333333";
const audience = "api://44444444-4444-4444-8444-444444444444";
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const keyId = "controlled-test-key";

const config: EntraTokenVerifierConfig = {
  tenantId,
  audience,
  allowedClientIds: [allowedClientId],
  clockToleranceSeconds: 0,
  maxTokenAgeSeconds: 3_600,
  jwksCacheMs: 600_000,
  jwksCooldownMs: 30_000,
  jwksTimeoutMs: 5_000,
};

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let localJwks: JWTVerifyGetKey;
let verifier: EntraApplicationTokenVerifier;

before(async () => {
  const primary = await generateKeyPair("RS256", { extractable: true });
  const other = await generateKeyPair("RS256", { extractable: true });
  privateKey = primary.privateKey;
  otherPrivateKey = other.privateKey;
  const publicJwk: JWK = { ...await exportJWK(primary.publicKey), kid: keyId, use: "sig", alg: "RS256" };
  localJwks = createLocalJWKSet({ keys: [publicJwk] });
  verifier = new EntraApplicationTokenVerifier(config, localJwks);
});

interface TokenOverrides {
  readonly signingKey?: CryptoKey;
  readonly issuer?: string;
  readonly audience?: string;
  readonly applicationId?: string;
  readonly roles?: readonly string[];
  readonly issuedAt?: number;
  readonly expirationTime?: number;
}

async function token(overrides: TokenOverrides = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1_000);
  const jwt = new SignJWT({
    ver: "2.0",
    azp: overrides.applicationId ?? allowedClientId,
    ...(overrides.roles === undefined ? {} : { roles: overrides.roles }),
  })
    .setProtectedHeader({ alg: "RS256", kid: keyId, typ: "JWT" })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setIssuedAt(overrides.issuedAt ?? now)
    .setExpirationTime(overrides.expirationTime ?? now + 3_600);
  return jwt.sign(overrides.signingKey ?? privateKey);
}

async function rejectsVerification(jwt: string): Promise<void> {
  await assert.rejects(
    verifier.verify(jwt),
    (error: unknown) => error instanceof ApplicationTokenVerificationError
      && error.message === "Application access token verification failed.",
  );
}

describe("Entra application token verification", () => {
  it("returns a verified application identity and recognized permissions", async () => {
    const identity = await verifier.verify(await token({
      roles: [
        applicationPermissions.coverageStoreNationwideRead,
        applicationPermissions.coverageEmployeeNationwideRead,
      ],
    }));

    assert.equal(identity.authenticationMode, "entra");
    assert.equal(identity.applicationId, allowedClientId);
    assert.deepEqual([...identity.permissions].sort(), [
      applicationPermissions.coverageEmployeeNationwideRead,
      applicationPermissions.coverageStoreNationwideRead,
    ]);
  });

  it("rejects a token signed by an untrusted key", async () => {
    await rejectsVerification(await token({ signingKey: otherPrivateKey }));
  });

  it("rejects an expired token", async () => {
    const now = Math.floor(Date.now() / 1_000);
    await rejectsVerification(await token({ issuedAt: now - 600, expirationTime: now - 300 }));
  });

  it("rejects the wrong issuer", async () => {
    await rejectsVerification(await token({ issuer: "https://login.microsoftonline.com/common/v2.0" }));
  });

  it("rejects the wrong audience", async () => {
    await rejectsVerification(await token({ audience: "api://55555555-5555-4555-8555-555555555555" }));
  });

  it("rejects an authenticated application outside the client allowlist", async () => {
    await rejectsVerification(await token({ applicationId: unauthorizedClientId }));
  });

  it("does not invent permissions when roles are absent or unrecognized", async () => {
    const noRoles = await verifier.verify(await token());
    const unrelatedRole = await verifier.verify(await token({ roles: ["admin", "coverage_store:region:read"] }));
    assert.deepEqual([...noRoles.permissions], []);
    assert.deepEqual([...unrelatedRole.permissions], []);
  });
});

describe("production authentication mode", () => {
  it("routes a local development credential through JWT verification instead of accepting it", async () => {
    const productionEnv = getEnv({
      NODE_ENV: "production",
      CHAT_ENTRA_TENANT_ID: tenantId,
      CHAT_ENTRA_API_AUDIENCE: audience,
      CHAT_ENTRA_ALLOWED_CLIENT_IDS: allowedClientId,
      CHAT_RATE_LIMIT_WINDOW_MS: "60000",
      CHAT_RATE_LIMIT_MAX_REQUESTS: "60",
      CHAT_SEMANTIC_MAX_CONCURRENCY: "4",
      CHAT_SEMANTIC_MAX_QUEUE: "16",
      CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: "5000",
      CHAT_REQUEST_TIMEOUT_MS: "65000",
      CHAT_MAX_RESPONSE_BYTES: "16384",
      CHAT_REQUIRE_HTTPS: "true",
      CHAT_SEMANTIC_ENABLED: "true",
      CHAT_POWERBI_TENANT_ID: tenantId,
      CHAT_POWERBI_CLIENT_ID: allowedClientId,
      CHAT_POWERBI_CLIENT_SECRET: "controlled-test-secret",
      CHAT_POWERBI_WORKSPACE_ID: unauthorizedClientId,
      CHAT_POWERBI_SEMANTIC_MODEL_ID: "44444444-4444-4444-8444-444444444444",
    });
    let verifiedToken = "";
    const middleware = createAuthenticationMiddleware(productionEnv, {
      async verify(value) {
        verifiedToken = value;
        throw new ApplicationTokenVerificationError();
      },
    });
    const localCredential = "local-development-credential-only";
    let statusCode = 0;
    let responseBody: unknown;
    let nextCalled = false;
    const request = {
      requestId: "production-local-isolation",
      header(name: string) {
        return name === "authorization" ? `Bearer ${localCredential}` : undefined;
      },
    } as unknown as Request;
    const response = {
      setHeader() {},
      status(code: number) {
        statusCode = code;
        return response;
      },
      json(body: unknown) {
        responseBody = body;
        return response;
      },
    } as unknown as Response;

    await middleware(request, response, (() => { nextCalled = true; }) as NextFunction);
    const serializedBody = JSON.stringify(responseBody);
    assert.equal(verifiedToken, localCredential);
    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
    assert.match(serializedBody, /UNAUTHORIZED/);
    assert.doesNotMatch(serializedBody, new RegExp(localCredential));
  });
});
