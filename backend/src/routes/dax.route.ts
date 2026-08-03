import { Router } from "express";
import type { DaxController } from "../controllers/dax.controller.js";

export function createDaxRouter(controller: DaxController): Router {
  const router = Router();
  router.post("/query", controller.executeQuery);
  router.post("/batch", controller.executeBatch);
  return router;
}
