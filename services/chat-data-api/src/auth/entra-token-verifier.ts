import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTPayload,
} from "jose";
import type { ChatDataEnv } from "../config/env.js";
import { isApplicationPermission } from "./permissions.js";
import {
  ApplicationTokenVerificationError,
  type ApplicationTokenVerifier,
  type AuthenticatedApplication,
} from "./types.js";

export interface EntraTokenVerifierConfig {
  readonly tenantId: string;
  readonly audience: string;
  readonly allowedClientIds: readonly string[];
  readonly clockToleranceSeconds: number;
  readonly maxTokenAgeSeconds: number;
  readonly jwksCacheMs: number;
  readonly jwksCooldownMs: number;
  readonly jwksTimeoutMs: number;
}

type VerifyJwt = (
  token: string,
  key: JWTVerifyGetKey,
  options: Parameters<typeof jwtVerify>[2],
) => Promise<{ payload: JWTPayload }>;

export class EntraApplicationTokenVerifier implements ApplicationTokenVerifier {
  private readonly issuer: string;
  private readonly allowedClientIds: ReadonlySet<string>;

  constructor(
    private readonly config: EntraTokenVerifierConfig,
    private readonly key: JWTVerifyGetKey = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`),
      {
        cacheMaxAge: config.jwksCacheMs,
        cooldownDuration: config.jwksCooldownMs,
        timeoutDuration: config.jwksTimeoutMs,
      },
    ),
    private readonly verifyJwt: VerifyJwt = jwtVerify,
  ) {
    this.issuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
    this.allowedClientIds = new Set(config.allowedClientIds.map((id) => id.toLowerCase()));
  }

  async verify(token: string): Promise<AuthenticatedApplication> {
    try {
      const { payload } = await this.verifyJwt(token, this.key, {
        algorithms: ["RS256"],
        issuer: this.issuer,
        audience: this.config.audience,
        clockTolerance: this.config.clockToleranceSeconds,
        maxTokenAge: `${this.config.maxTokenAgeSeconds}s`,
      });
      if (payload.ver !== "2.0" || typeof payload.azp !== "string") throw new Error("Invalid application identity claims.");
      if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) throw new Error("Required lifetime claims are absent.");
      if (payload.exp! <= payload.iat! || payload.exp! - payload.iat! > this.config.maxTokenAgeSeconds) {
        throw new Error("Token lifetime exceeds policy.");
      }

      const applicationId = payload.azp.toLowerCase();
      if (!this.allowedClientIds.has(applicationId)) throw new Error("Application is not allowlisted.");

      const roles = Array.isArray(payload.roles)
        ? payload.roles.filter((role): role is string => typeof role === "string")
        : [];
      const permissions = new Set(roles.filter(isApplicationPermission));
      return { authenticationMode: "entra", applicationId, permissions };
    } catch (error) {
      throw new ApplicationTokenVerificationError({ cause: error });
    }
  }
}

export function createEntraApplicationTokenVerifier(env: ChatDataEnv): ApplicationTokenVerifier {
  if (!env.CHAT_ENTRA_TENANT_ID || !env.CHAT_ENTRA_API_AUDIENCE || !env.CHAT_ENTRA_ALLOWED_CLIENT_IDS) {
    throw new Error("Production application authentication is not configured.");
  }
  return new EntraApplicationTokenVerifier({
    tenantId: env.CHAT_ENTRA_TENANT_ID,
    audience: env.CHAT_ENTRA_API_AUDIENCE,
    allowedClientIds: env.CHAT_ENTRA_ALLOWED_CLIENT_IDS,
    clockToleranceSeconds: env.CHAT_ENTRA_CLOCK_TOLERANCE_SECONDS,
    maxTokenAgeSeconds: env.CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS,
    jwksCacheMs: env.CHAT_ENTRA_JWKS_CACHE_MS,
    jwksCooldownMs: env.CHAT_ENTRA_JWKS_COOLDOWN_MS,
    jwksTimeoutMs: env.CHAT_ENTRA_JWKS_TIMEOUT_MS,
  });
}
