import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "../lib/auth";
import { endSession, startSession } from "../lib/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

const INVALID_LOGIN = "Invalid email or password";

function publicUser(u: { id: number; name: string; email: string; role: string }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

// POST /api/admin/login  (rate limited — see authRoutes)
// Same generic error and the same bcrypt cost for "no such account" and
// "wrong password", so neither the message nor the timing reveals which
// emails exist.
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) {
    await burnPasswordCheck(password);
    console.warn(`[auth] failed login (unknown account) from ${req.ip}`);
    return res.status(401).json({ error: INVALID_LOGIN });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    console.warn(`[auth] failed login for user #${user.id} from ${req.ip}`);
    return res.status(401).json({ error: INVALID_LOGIN });
  }

  const token = startSession(req, res, {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  // `token` is only present for bearer clients (mobile); browsers get the
  // httpOnly cookie instead and never see the raw JWT.
  return res.json({ ...(token ? { token } : {}), user: publicUser(user) });
}

// POST /api/admin/logout
export async function logout(_req: Request, res: Response) {
  endSession(res);
  return res.json({ success: true });
}

// GET /api/admin/me  (requireAuth)
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    endSession(res);
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json(publicUser(user));
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().max(200),
});

// POST /api/admin/change-password  (requireAuth, rate limited)
// Changes the caller's OWN password and bumps tokenVersion, which revokes
// every other session (other browsers, the mobile app, a stolen token).
// The current session is re-issued so the user isn't logged out here.
export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { currentPassword, newPassword } = parsed.data;

  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: "New password must be different from the current one" });
  }

  const userId = req.user!.userId;
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    endSession(res);
    return res.status(401).json({ error: "Not authenticated" });
  }

  const valid = await verifyPassword(currentPassword, existing.passwordHash);
  if (!valid) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });

  const token = startSession(req, res, {
    userId: updated.id,
    email: updated.email,
    role: updated.role,
    tokenVersion: updated.tokenVersion,
  });

  return res.json({ success: true, ...(token ? { token } : {}) });
}
