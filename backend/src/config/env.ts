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

  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:5173"),
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

  corsOrigins:
    parsed.data.CORS_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
});