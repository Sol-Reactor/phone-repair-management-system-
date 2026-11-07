import { Router } from "express";
import { getConfig, updateConfig } from "../controllers/configController";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getConfig));
router.put("/", requireAdmin, asyncHandler(updateConfig));

export default router;
