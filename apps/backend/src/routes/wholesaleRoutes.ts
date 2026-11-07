import { Router } from "express";
import {
  listItems,
  createItem,
  deleteItem,
  listTechnicians,
  createTechnician,
  listDebtors,
  listLedger,
  getLedgerEntry,
  createDistribution,
} from "../controllers/wholesaleController";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// The whole B2B distribution branch is staff-only — no public reads here,
// unlike price-list/repair-types which the public registration flow needs.
router.use(requireAdmin);

router.get("/items", asyncHandler(listItems));
router.post("/items", asyncHandler(createItem));
router.delete("/items/:id", asyncHandler(deleteItem));

router.get("/technicians", asyncHandler(listTechnicians));
router.post("/technicians", asyncHandler(createTechnician));

router.get("/debtors", asyncHandler(listDebtors));

router.get("/ledger", asyncHandler(listLedger));
router.get("/ledger/:id", asyncHandler(getLedgerEntry));

router.post("/distribute", asyncHandler(createDistribution));

export default router;
