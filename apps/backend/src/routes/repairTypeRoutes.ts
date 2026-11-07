import { Router } from "express";
import {
  listRepairTypes,
  getRepairType,
  createRepairType,
  updateRepairType,
  deleteRepairType,
} from "../controllers/repairTypeController";
import { requireAuth, requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Issue 3: reads were public (RegisterPage's dropdown needed them without
// login) but RegisterPage itself is staff-only now, so gate everything here.
//
// requireAuth on the router (both roles — TECHNICIANs need this dropdown to
// register/work tickets), requireAdmin additionally on the writes (only the
// owner edits the repair-type catalog/durations).
router.use(requireAuth);

router.get("/", asyncHandler(listRepairTypes));
router.get("/:id", asyncHandler(getRepairType));
router.post("/", requireAdmin, asyncHandler(createRepairType));
router.put("/:id", requireAdmin, asyncHandler(updateRepairType));
router.delete("/:id", requireAdmin, asyncHandler(deleteRepairType));

export default router;
