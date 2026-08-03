import "dotenv/config";
import { z } from "zod";

const uuid = z.string().uuid();
const positiveInteger = (minimum: number, maximum: number) =>
  z.coerce.number().int().min(minimum).max(maximum);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: positiveInteger(1, 65_535).default(3_000),
  TENANT_ID: uuid,
  CLIENT_ID: uuid,
  CLIENT_SECRET: z.string().min(1),
  WORKSPACE_ID: uuid,
  SEMANTIC_MODEL_ID: uuid,
  CORS_ORIGINS: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  POWERBI_TIMEOUT_MS: positiveInteger(1, 300_000).default(60_000),
  DAX_MAX_LENGTH_BYTES: positiveInteger(1, 1_048_576).default(64_000),
  BATCH_MAX_QUERIES: positiveInteger(1, 100).default(10),
  BATCH_CONCURRENCY: positiveInteger(1, 100).default(4),
});

export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://still-coast-29a4a239b5-southeastasia.webapp.fabricapps.net",
  "https://firm-thyme-e1ecf93bc7-southeastasia.webapp.fabricapps.net",
  "https://app.fabric.microsoft.com",
] as const;

export interface GatewayEnv extends z.infer<typeof envSchema> {
  readonly corsOrigins: readonly string[];
}

export class EnvironmentValidationError extends Error {
  public constructor(public readonly fields: readonly string[]) {
    super(`Missing or invalid environment fields: ${fields.join(", ")}`);
    this.name = "EnvironmentValidationError";
  }
}

function splitOrigins(value: string | undefined): string[] {
  return value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

function assertOrigins(origins: readonly string[]): void {
  const invalid = origins.some((origin) => {
    if (origin === "*") return true;
    try {
      const parsed = new URL(origin);
      return !["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin;
    } catch {
      return true;
    }
  });
  if (invalid) throw new EnvironmentValidationError(["CORS_ORIGINS"]);
}

export function parseEnv(input: NodeJS.ProcessEnv): GatewayEnv {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw new EnvironmentValidationError(
      Object.keys(parsed.error.flatten().fieldErrors).sort(),
    );
  }

  const corsOrigins = Array.from(new Set([
    ...DEFAULT_CORS_ORIGINS,
    ...splitOrigins(parsed.data.CORS_ORIGINS),
    ...splitOrigins(parsed.data.CORS_ORIGIN),
  ]));
  assertOrigins(corsOrigins);
  if (parsed.data.BATCH_CONCURRENCY > parsed.data.BATCH_MAX_QUERIES) {
    throw new EnvironmentValidationError(["BATCH_CONCURRENCY"]);
  }

  return Object.freeze({ ...parsed.data, corsOrigins });
}

let loadedEnv: GatewayEnv | undefined;

export function getEnv(): GatewayEnv {
  loadedEnv ??= parseEnv(process.env);
  return loadedEnv;
}
