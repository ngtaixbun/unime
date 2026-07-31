import { Router } from "express";

import msalClient from "../clients/fabric.client";
import { FabricService } from "../services/fabric.service";
import { executeDaxQuery, executeDaxBatch } from "../controllers/dax.controller";

const router = Router();

// One FabricService instance shared across all requests on this router.
const fabricService = new FabricService(msalClient);

/**
 * POST /api/dax/query
 *
 * Body: { dax: "EVALUATE ..." }
 * Response: { success: true, data: { columns, rows }, meta: { rowCount } }
 */
router.post("/query", executeDaxQuery(fabricService));

/**
 * POST /api/dax/batch
 *
 * Body: { queries: [{ name: "kpi", dax: "EVALUATE ..." }, ...] }
 * Response: { success: true, data: { kpi: {columns,rows}, ... } }
 *
 * Single roundtrip for multiple queries — saves ~500ms when
 * dashboards fire 8 parallel queries (4 overview + 4 dimension DISTINCT).
 */
router.post("/batch", executeDaxBatch(fabricService));

export default router;
