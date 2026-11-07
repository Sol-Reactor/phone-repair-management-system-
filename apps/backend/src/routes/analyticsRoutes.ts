import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.use(requireAdmin);
router.get("/", asyncHandler(getAnalytics));

export default router;
