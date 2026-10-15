import "dotenv/config";
import { z } from "zod";

const optionalUuid = z.string().uuid().optional();
const optionalNonEmpty = z.string().trim().min(1).optional();
const optionalUuidList = z.string().transform((value, context) => {
  const values = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  const parsed = z.array(z.string().uuid()).min(1).safeParse(values);
  if (!parsed.success) {
    context.addIssue({ code: "custom", message: "Expected a comma-separated list of UUIDs." });
    return z.NEVER;
  }
  return [...new Set(parsed.data)];
}).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3101),
  CHAT_HOST: z.union([z.ipv4(), z.ipv6()]).default("127.0.0.1"),
  CHAT_DATA_API_TEST_CREDENTIAL: z.string().min(16).optional(),
  CHAT_ENTRA_TENANT_ID: optionalUuid,
  CHAT_ENTRA_API_AUDIENCE: optionalNonEmpty,
  CHAT_ENTRA_ALLOWED_CLIENT_IDS: optionalUuidList,
  CHAT_ENTRA_CLOCK_TOLERANCE_SECONDS: z.coerce.number().int().min(0).max(300).default(30),
  CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
  CHAT_ENTRA_JWKS_CACHE_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(600_000),
  CHAT_ENTRA_JWKS_COOLDOWN_MS: z.coerce.number().int().min(1_000).max(300_000).default(30_000),
  CHAT_ENTRA_JWKS_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(5_000),
  CHAT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
  CHAT_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(100_000).default(60),
  CHAT_RATE_LIMIT_MAX_CLIENTS: z.coerce.number().int().min(1).max(100_000).default(10_000),
  CHAT_SEMANTIC_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(4),
  CHAT_SEMANTIC_MAX_QUEUE: z.coerce.number().int().min(0).max(10_000).default(16),
  CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: z.coerce.number().int().min(1).max(300_000).default(5_000),
  CHAT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(65_000),
  CHAT_MAX_RESPONSE_BYTES: z.coerce.number().int().min(1_024).max(1_048_576).default(16_384),
  CHAT_REQUIRE_HTTPS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CHAT_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  CHAT_SEMANTIC_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CHAT_POWERBI_TENANT_ID: optionalUuid,
  CHAT_POWERBI_CLIENT_ID: optionalUuid,
  CHAT_POWERBI_CLIENT_SECRET: z.string().min(1).optional(),
  CHAT_POWERBI_WORKSPACE_ID: optionalUuid,
  CHAT_POWERBI_SEMANTIC_MODEL_ID: optionalUuid,
  CHAT_POWERBI_TIMEOUT_MS: z.coerce.number().int().min(1).max(300_000).default(60_000),
  CHAT_POWERBI_MAX_RESPONSE_BYTES: z.coerce.number().int().min(1_024).max(1_048_576).default(262_144),
}).strict();

export type ChatDataEnv = z.infer<typeof envSchema>;

export class EnvironmentValidationError extends Error {
  constructor(readonly fields: readonly string[]) {
    super("Chat Data API environment is invalid.");
    this.name = "EnvironmentValidationError";
  }
}

export function getEnv(source: NodeJS.ProcessEnv = process.env): ChatDataEnv {
  const projected = {
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    CHAT_HOST: source.CHAT_HOST,
    CHAT_DATA_API_TEST_CREDENTIAL: source.CHAT_DATA_API_TEST_CREDENTIAL,
    CHAT_ENTRA_TENANT_ID: source.CHAT_ENTRA_TENANT_ID,
    CHAT_ENTRA_API_AUDIENCE: source.CHAT_ENTRA_API_AUDIENCE,
    CHAT_ENTRA_ALLOWED_CLIENT_IDS: source.CHAT_ENTRA_ALLOWED_CLIENT_IDS,
    CHAT_ENTRA_CLOCK_TOLERANCE_SECONDS: source.CHAT_ENTRA_CLOCK_TOLERANCE_SECONDS,
    CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS: source.CHAT_ENTRA_MAX_TOKEN_AGE_SECONDS,
    CHAT_ENTRA_JWKS_CACHE_MS: source.CHAT_ENTRA_JWKS_CACHE_MS,
    CHAT_ENTRA_JWKS_COOLDOWN_MS: source.CHAT_ENTRA_JWKS_COOLDOWN_MS,
    CHAT_ENTRA_JWKS_TIMEOUT_MS: source.CHAT_ENTRA_JWKS_TIMEOUT_MS,
    CHAT_RATE_LIMIT_WINDOW_MS: source.CHAT_RATE_LIMIT_WINDOW_MS,
    CHAT_RATE_LIMIT_MAX_REQUESTS: source.CHAT_RATE_LIMIT_MAX_REQUESTS,
    CHAT_RATE_LIMIT_MAX_CLIENTS: source.CHAT_RATE_LIMIT_MAX_CLIENTS,
    CHAT_SEMANTIC_MAX_CONCURRENCY: source.CHAT_SEMANTIC_MAX_CONCURRENCY,
    CHAT_SEMANTIC_MAX_QUEUE: source.CHAT_SEMANTIC_MAX_QUEUE,
    CHAT_SEMANTIC_QUEUE_TIMEOUT_MS: source.CHAT_SEMANTIC_QUEUE_TIMEOUT_MS,
    CHAT_REQUEST_TIMEOUT_MS: source.CHAT_REQUEST_TIMEOUT_MS,
    CHAT_MAX_RESPONSE_BYTES: source.CHAT_MAX_RESPONSE_BYTES,
    CHAT_REQUIRE_HTTPS: source.CHAT_REQUIRE_HTTPS,
    CHAT_TRUST_PROXY_HOPS: source.CHAT_TRUST_PROXY_HOPS,
    CHAT_SEMANTIC_ENABLED: source.CHAT_SEMANTIC_ENABLED,
    CHAT_POWERBI_TENANT_ID: source.CHAT_POWERBI_TENANT_ID,
    CHAT_POWERBI_CLIENT_ID: source.CHAT_POWERBI_CLIENT_ID,
    CHAT_POWERBI_CLIENT_SECRET: source.CHAT_POWERBI_CLIENT_SECRET,
    CHAT_POWERBI_WORKSPACE_ID: source.CHAT_POWERBI_WORKSPACE_ID,
    CHAT_POWERBI_SEMANTIC_MODEL_ID: source.CHAT_POWERBI_SEMANTIC_MODEL_ID,
    CHAT_POWERBI_TIMEOUT_MS: source.CHAT_POWERBI_TIMEOUT_MS,
    CHAT_POWERBI_MAX_RESPONSE_BYTES: source.CHAT_POWERBI_MAX_RESPONSE_BYTES,
  };
  const emptyOptionalFields = new Set([
    "CHAT_DATA_API_TEST_CREDENTIAL",
    "CHAT_ENTRA_TENANT_ID",
    "CHAT_ENTRA_API_AUDIENCE",
    "CHAT_ENTRA_ALLOWED_CLIENT_IDS",
  ]);
  const input = Object.fromEntries(Object.entries(projected).filter(([key, value]) =>
    value !== undefined
      && !(value === "" && (key.startsWith("CHAT_POWERBI_") || emptyOptionalFields.has(key))),
  ));
  const result = envSchema.safeParse(input);

  if (!result.success) {
    throw new EnvironmentValidationError(result.error.issues.map((issue) => issue.path.join(".") || "environment"));
  }

  if (result.data.NODE_ENV === "production") {
    const missing = [
      "CHAT_ENTRA_TENANT_ID",
      "CHAT_ENTRA_API_AUDIENCE",
      "CHAT_ENTRA_ALLOWED_CLIENT_IDS",
      "CHAT_RATE_LIMIT_WINDOW_MS",
      "CHAT_RATE_LIMIT_MAX_REQUESTS",
      "CHAT_SEMANTIC_MAX_CONCURRENCY",
      "CHAT_SEMANTIC_MAX_QUEUE",
      "CHAT_SEMANTIC_QUEUE_TIMEOUT_MS",
      "CHAT_REQUEST_TIMEOUT_MS",
      "CHAT_MAX_RESPONSE_BYTES",
    ].filter((field) => result.data[field as keyof ChatDataEnv] === undefined);
    if (result.data.CHAT_DATA_API_TEST_CREDENTIAL !== undefined) {
      missing.push("CHAT_DATA_API_TEST_CREDENTIAL");
    }
    for (const field of [
      "CHAT_RATE_LIMIT_WINDOW_MS",
      "CHAT_RATE_LIMIT_MAX_REQUESTS",
      "CHAT_SEMANTIC_MAX_CONCURRENCY",
      "CHAT_SEMANTIC_MAX_QUEUE",
      "CHAT_SEMANTIC_QUEUE_TIMEOUT_MS",
      "CHAT_REQUEST_TIMEOUT_MS",
      "CHAT_MAX_RESPONSE_BYTES",
    ] as const) {
      if (source[field] === undefined) missing.push(field);
    }
    if (!result.data.CHAT_REQUIRE_HTTPS) missing.push("CHAT_REQUIRE_HTTPS");
    if (missing.length > 0) throw new EnvironmentValidationError([...new Set(missing)]);
  }

  // Only a production instance, which enforces Entra and HTTPS, may listen
  // beyond loopback. Development keeps the test credential on 127.0.0.1/::1.
  if (result.data.NODE_ENV !== "production" && !["127.0.0.1", "::1"].includes(result.data.CHAT_HOST)) {
    throw new EnvironmentValidationError(["CHAT_HOST"]);
  }

  if (result.data.CHAT_SEMANTIC_ENABLED) {
    const missing = [
      "CHAT_POWERBI_TENANT_ID",
      "CHAT_POWERBI_CLIENT_ID",
      "CHAT_POWERBI_CLIENT_SECRET",
      "CHAT_POWERBI_WORKSPACE_ID",
      "CHAT_POWERBI_SEMANTIC_MODEL_ID",
    ].filter((field) => result.data[field as keyof ChatDataEnv] === undefined);
    if (missing.length > 0) throw new EnvironmentValidationError(missing);
  }

  return result.data;
}
