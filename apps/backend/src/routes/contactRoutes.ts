import { Router } from "express";
import {
  submitContactMessage,
  listContactMessages,
  getContactMessage,
  replyToContactMessage,
} from "../controllers/contactController";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { contactLimiter } from "../middleware/security";

const router = Router();

// Submitting a message is public (anyone on the marketing site can use the
// "Get in Touch" form). Reading/managing the inbox is staff-only.
router.post("/", contactLimiter, asyncHandler(submitContactMessage));
router.get("/", requireAdmin, asyncHandler(listContactMessages));
router.get("/:id", requireAdmin, asyncHandler(getContactMessage));
router.post("/:id/reply", requireAdmin, asyncHandler(replyToContactMessage));

export default router;
