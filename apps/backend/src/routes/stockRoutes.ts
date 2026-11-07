import { Router } from "express";
import {
  listSuppliers,
  createSupplier,
  restockItem,
  reportDefective,
  listDefective,
  markDefectiveRefunded,
  lowStock,
} from "../controllers/stockController";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

// Cost prices, suppliers, and stock levels are sensitive business data —
// staff-only, mounted under /admin like wholesale and analytics (the spec's
// literal /api/stock/* would have left this unauthenticated).
router.use(requireAdmin);

router.get("/suppliers", asyncHandler(listSuppliers));
router.post("/suppliers", asyncHandler(createSupplier));

router.post("/restock", asyncHandler(restockItem));

router.post("/defective", asyncHandler(reportDefective));
router.get("/defective", asyncHandler(listDefective));
router.patch("/defective/:id/refund", asyncHandler(markDefectiveRefunded));

router.get("/low", asyncHandler(lowStock));

export default router;
