import { Router } from "express";
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  updateRepairStage,
  reorderTicket,
  cancelTicket,
  overrideTicketPrice,
} from "../controllers/ticketController";
import { saveChecklist } from "../controllers/checklistController";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/requireAdmin";

const router = Router();

// Issue 3: all ticket data is staff-only now (queue dashboard, registration,
// and slip viewing all require login on the frontend, per that decision —
// gate the API the same way so the same data can't be fetched directly
// (e.g. via Postman) without a valid token). The public guest tracker lives
// entirely under /api/track instead, which stays unauthenticated.
//
// requireAuth (not requireAdmin): tickets are the day-to-day queue that
// BOTH roles work in. TECHNICIANs need full read/write here; only the
// separate financial routes (wholesale, analytics, stock) are ADMIN-only.
router.use(requireAuth);

router.get("/", asyncHandler(listTickets));
router.post("/", asyncHandler(createTicket));
router.get("/:id", asyncHandler(getTicket));
router.patch("/:id/status", asyncHandler(updateTicketStatus));
router.patch("/:id/stage", asyncHandler(updateRepairStage));
router.patch("/:id/reorder", asyncHandler(reorderTicket));
router.patch("/:id/cancel", asyncHandler(cancelTicket));
router.patch("/:id/price", asyncHandler(overrideTicketPrice));
// Pre-Repair Checklist (liability protection) — must exist before /status
// will allow WAITING -> IN_PROGRESS; see updateTicketStatus.
router.post("/:id/checklist", asyncHandler(saveChecklist));

export default router;
