import "dotenv/config";
import { z } from "zod";

/**
 * Schema cho toàn bộ biến môi trường của backend.
 * Validate ngay khi module được nạp → fail-fast nếu thiếu config.
 */
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),

    // Microsoft Entra ID (Service Principal)
    TENANT_ID: z.string().uuid("TENANT_ID phải là GUID"),
    CLIENT_ID: z.string().uuid("CLIENT_ID phải là GUID"),
    CLIENT_SECRET: z.string().min(1, "CLIENT_SECRET không được rỗng"),

    // Fabric semantic model
    WORKSPACE_ID: z.string().uuid("WORKSPACE_ID phải là GUID"),
    SEMANTIC_MODEL_ID: z.string().uuid("SEMANTIC_MODEL_ID phải là GUID"),

    // Request limits
    DAX_MAX_LENGTH_BYTES: z.coerce.number().int().positive().default(512_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Power BI / Fabric resource scope cho client_credentials flow. */
export const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

/** Base URL của Power BI REST API. */
export const POWERBI_API_BASE = "https://api.powerbi.com/v1.0/myorg";
