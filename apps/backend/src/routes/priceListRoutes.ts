import { Router } from "express";
import {
  listPriceList,
  getPriceListEntry,
  lookupPrice,
  createPriceListEntry,
  updatePriceListEntry,
  deletePriceListEntry,
} from "../controllers/priceListController";
import { requireAuth, requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Issue 3: reads were public (RegisterPage's cost preview needed them
// without login) but RegisterPage itself is staff-only now, so gate
// everything here.
//
// requireAuth on the router (both roles — TECHNICIANs need the price
// lookup while registering tickets), requireAdmin additionally on the
// writes (only the owner edits base prices — that's financial data).
router.use(requireAuth);

// NOTE: /lookup must be registered before /:id so it isn't swallowed by the
// :id param route.
router.get("/lookup", asyncHandler(lookupPrice));
router.get("/", asyncHandler(listPriceList));
router.get("/:id", asyncHandler(getPriceListEntry));
router.post("/", requireAdmin, asyncHandler(createPriceListEntry));
router.put("/:id", requireAdmin, asyncHandler(updatePriceListEntry));
router.delete("/:id", requireAdmin, asyncHandler(deletePriceListEntry));

export default router;
