import { Request, Response } from "express";

import { env } from "../config/env";
import msalClient from "../clients/fabric.client";

/**
 * GET /api/auth/token — DEV-ONLY debug endpoint.
 * Returns token length (never the full token) to verify MSAL auth is working.
 */
export async function testToken(
    _req: Request,
    res: Response,
): Promise<void> {
    // Gate by NODE_ENV — not exposed in production
    if (env.NODE_ENV === "production") {
        res.status(404).json({ success: false, message: "Not found" });
        return;
    }

    try {
        const result = await msalClient.acquireTokenByClientCredential({
            scopes: ["https://analysis.windows.net/powerbi/api/.default"],
        });

        if (!result?.accessToken) {
            throw new Error("No access token returned.");
        }

        res.status(200).json({
            success: true,
            message: "Access token acquired successfully.",
            tokenLength: result.accessToken.length,
        });
    } catch (error) {
        console.error("[auth/testToken]", error);

        res.status(500).json({
            success: false,
            message: "Failed to acquire access token.",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
