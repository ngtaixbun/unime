import { Request, Response, NextFunction } from "express";

import { env } from "../config/env";
import { FabricService, FabricServiceError } from "../services/fabric.service";
import { ExecuteDaxRequest } from "../types/dax.types";

/**
 * POST /api/dax/query — Single DAX query.
 */
export function executeDaxQuery(fabricService: FabricService) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = req.body as ExecuteDaxRequest;

            if (!body?.dax || typeof body.dax !== "string") {
                res.status(400).json({
                    success: false,
                    error: { code: "INVALID_REQUEST", message: "Missing 'dax' field" },
                });
                return;
            }

            if (body.dax.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: { code: "EMPTY_DAX", message: "DAX query không được rỗng." },
                });
                return;
            }

            if (Buffer.byteLength(body.dax, "utf-8") > env.DAX_MAX_LENGTH_BYTES) {
                res.status(400).json({
                    success: false,
                    error: { code: "DAX_TOO_LARGE", message: `DAX query vượt quá giới hạn ${env.DAX_MAX_LENGTH_BYTES} bytes.` },
                });
                return;
            }

            const result = await fabricService.executeDax(body.dax, req.signal);

            res.status(200).json({
                success: true,
                data: result,
                meta: { rowCount: result.rows.length },
            });
        } catch (err) {
            console.error(`[dax.controller] ${err instanceof Error ? err.stack || err.message : String(err)}`);
            if (err instanceof FabricServiceError) {
                res.status(err.httpStatus).json({ success: false, error: { code: err.code, message: err.message } });
                return;
            }
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
                });
            }
        }
    };
}

/**
 * POST /api/dax/batch — Multiple DAX queries in one roundtrip.
 *
 * Body: { queries: [{ name: "kpi", dax: "..." }, ...] }
 * Max 10 queries per call (Fabric REST limit).
 */
export function executeDaxBatch(fabricService: FabricService) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = req.body as { queries?: Array<{ name: string; dax: string }> };

            if (!body?.queries || !Array.isArray(body.queries) || body.queries.length === 0) {
                res.status(400).json({
                    success: false,
                    error: { code: "INVALID_REQUEST", message: "Missing 'queries' array" },
                });
                return;
            }

            if (body.queries.length > 10) {
                res.status(400).json({
                    success: false,
                    error: { code: "TOO_MANY_QUERIES", message: "Max 10 queries per batch" },
                });
                return;
            }

            // Validate each
            for (const [i, q] of body.queries.entries()) {
                if (!q?.name || typeof q.name !== "string") {
                    res.status(400).json({
                        success: false,
                        error: { code: "INVALID_REQUEST", message: `queries[${i}].name required (string)` },
                    });
                    return;
                }
                if (!q?.dax || typeof q.dax !== "string" || q.dax.trim().length === 0) {
                    res.status(400).json({
                        success: false,
                        error: { code: "INVALID_REQUEST", message: `queries[${i}].dax required (non-empty string)` },
                    });
                    return;
                }
            }

            const results = await fabricService.executeDaxBatch(body.queries, req.signal);

            res.status(200).json({
                success: true,
                data: results,
                meta: { queryCount: body.queries.length },
            });
        } catch (err) {
            console.error(`[dax.controller:batch] ${err instanceof Error ? err.stack || err.message : String(err)}`);
            if (err instanceof FabricServiceError) {
                res.status(err.httpStatus).json({ success: false, error: { code: err.code, message: err.message } });
                return;
            }
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
                });
            }
        }
    };
}
