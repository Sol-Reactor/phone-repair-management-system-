import { Router } from "express";
import { searchCustomers } from "../controllers/customerController";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/requireAdmin";

const router = Router();

// Issue 3: customer PII (name/phone/email), staff-only — but both roles
// (not just ADMIN), since TECHNICIANs look up customers while registering
// and working tickets. requireAuth, not requireAdmin.
router.use(requireAuth);

router.get("/search", asyncHandler(searchCustomers));

export default router;
