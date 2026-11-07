import { Router } from "express";
import { login, logout, me, changePassword } from "../controllers/authController";
import { requireAuth } from "../middleware/requireAdmin";
import { loginIpLimiter, loginLimiter, passwordChangeLimiter } from "../middleware/security";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.post("/login", loginIpLimiter, loginLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
// Any logged-in user (ADMIN or TECHNICIAN) can check who they are and
// change their own password.
router.get("/me", requireAuth, asyncHandler(me));
router.post("/change-password", requireAuth, passwordChangeLimiter, asyncHandler(changePassword));

export default router;
