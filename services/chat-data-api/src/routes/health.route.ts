import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

export function createHealthRouter(): Router {
  const router = Router();
  router.get("/", healthController);
  return router;
}
