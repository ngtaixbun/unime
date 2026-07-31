import { Request, Response, NextFunction } from "express";

import { FabricServiceError } from "../services/fabric.service";

/**
 * Express global error handler.
 * Maps known error types to appropriate HTTP status codes.
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // Known Fabric service error — pass through its HTTP status
    if (err instanceof FabricServiceError) {
        console.error(`[FabricServiceError] ${err.code}: ${err.message}`);
        res.status(err.httpStatus).json({
            success: false,
            error: { code: err.code, message: err.message },
        });
        return;
    }

    // Axios errors — extract upstream status when available
    if (err && typeof err === "object" && "isAxiosError" in err) {
        const axiosErr = err as { response?: { status?: number }; message?: string };
        const upstreamStatus = axiosErr.response?.status ?? 502;
        console.error(`[AxiosError] upstream=${upstreamStatus}: ${axiosErr.message}`);
        res.status(upstreamStatus === 401 || upstreamStatus === 403 ? 502 : upstreamStatus).json({
            success: false,
            error: {
                code: "FABRIC_REQUEST_FAILED",
                message: `Request to Fabric semantic model failed (${upstreamStatus}).`,
            },
        });
        return;
    }

    // Unknown error — fallback
    console.error("[UnhandledError]", err);
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error.",
        },
    });
}
