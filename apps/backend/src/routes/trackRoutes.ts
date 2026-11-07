import { Router } from "express";
import { trackTicket } from "../controllers/trackController";
import { trackLimiter } from "../middleware/security";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Public and unauthenticated — rate limited so the 6-character tracking
// codes can't be brute-forced.
router.get("/:trackingCode", trackLimiter, asyncHandler(trackTicket));

export default router;
