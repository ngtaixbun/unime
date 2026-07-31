import { Router } from "express";
import { testToken } from "../controllers/auth.controller";

const router = Router();

router.get("/token", testToken);

export default router;