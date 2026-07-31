import express from "express";
import cors from "cors";

import { requestLogger } from "./middleware/request-logger.middleware";
import { errorHandler } from "./middleware/error.middleware";
import indexRoute from "./routes/index.route";
import authRoute from "./routes/auth.route";
import daxRoute from "./routes/dax.route";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * CORS origins whitelist. Khi deploy production, đã có sẵn:
 *   - Local dev (Vite :5173, Vite preview :4173)
 *   - Fabric static hosting (mọi URL dạng https://*.webapp.fabricapps.net —
 *     mỗi lần deploy Rayfin app sinh random subdomain nên whitelist theo pattern)
 *   - Fabric portal host gốc (https://app.fabric.microsoft.com)
 * Mở rộng thêm qua env var CORS_ORIGIN (comma-separated) khi cần.
 */
const DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "https://app.fabric.microsoft.com",
];

// Cho phép mọi Fabric static-hosting URL (Rayfin CLI sinh subdomain random mỗi lần deploy).
// Domain do Microsoft sở hữu, không phải arbitrary user input.
const FABRIC_HOSTING_PATTERN = /^https:\/\/[a-z0-9-]+\.webapp\.fabricapps\.net$/i;

const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow server-to-server (no origin) for monitoring
            if (
                !origin ||
                DEFAULT_ORIGINS.includes(origin) ||
                envOrigins.includes(origin) ||
                FABRIC_HOSTING_PATTERN.test(origin)
            ) {
                callback(null, true);
            } else {
                console.warn(`[CORS] Blocked origin: ${origin}`);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

// ── Routes ───────────────────────────────────────────────────────────────────

app.use("/", indexRoute);
app.use("/api/auth", authRoute);
app.use("/api/dax", daxRoute);

// ── Error handler (must be last) ─────────────────────────────────────────────

app.use(errorHandler);

export default app;
