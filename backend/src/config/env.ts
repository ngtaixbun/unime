import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uuidSchema = z
  .string()
  .regex(
    uuidPattern,
    "Giá trị phải là UUID hợp lệ.",
  );

export function resolveGenericDaxEnabled(
  configured:
    "true" |
    "false" |
    undefined,
  nodeEnv:
    "development" |
    "test" |
    "production",
): boolean {
  if (
    nodeEnv === "production" &&
    configured === "true"
  ) {
    throw new Error(
      "GENERIC_DAX_ENABLED=true không được phép ở production trước khi có inbound authentication.",
    );
  }

  if (
    configured === undefined
  ) {
    return nodeEnv !==
      "production";
  }

  return configured ===
    "true";
}

const envSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "test",
      "production",
    ])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  POWERBI_TENANT_ID: uuidSchema,
  POWERBI_CLIENT_ID: uuidSchema,

  POWERBI_CLIENT_SECRET: z
    .string()
    .min(
      1,
      "POWERBI_CLIENT_SECRET đang trống.",
    ),

  POWERBI_WORKSPACE_ID: uuidSchema,
  POWERBI_DATASET_ID: uuidSchema,

  POWERBI_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120000)
    .default(60000),

  GENERIC_DAX_ENABLED: z
    .enum([
      "true",
      "false",
    ])
    .optional(),

  DAX_MAX_LENGTH_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(512_000)
    .default(64_000),

  DAX_MAX_EXPECTED_COLUMNS: z.coerce
    .number()
    .int()
    .min(1)
    .max(512)
    .default(128),

  CORS_ORIGINS: z
    .string()
    .min(1)
    .default(
      "http://localhost:5173,http://localhost:5174",
    ),
});

const parsed =
  envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Backend environment configuration is invalid.",
  );

  console.error(
    parsed.error.flatten().fieldErrors,
  );

  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,

  enableGenericDax:
    resolveGenericDaxEnabled(
      parsed.data.GENERIC_DAX_ENABLED,
      parsed.data.NODE_ENV,
    ),

  corsOrigins:
    parsed.data.CORS_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
});
