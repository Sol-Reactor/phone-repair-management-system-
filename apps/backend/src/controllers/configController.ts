import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// Config keys never exposed via the generic GET/PUT endpoints — they have
// their own dedicated, more careful handling.
// GET /api/config is public, so anything secret-looking is never returned or
// writable here — including the legacy admin_password_hash row that older
// databases may still contain from before per-user accounts existed.
const SECRET_KEY_RE = /(password|secret|token|hash|api_?key)/i;
const PROTECTED_KEYS = {
  has: (key: string) => key === "admin_password_hash" || SECRET_KEY_RE.test(key),
};

// GET /api/config
// Returns all shop configuration (name, address, hours, lunch break, etc.)
// as a flat { key: value } object. Public read: the registration/queue
// screens need this without an admin session.
export async function getConfig(_req: Request, res: Response) {
  const rows = await prisma.config.findMany();
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (!PROTECTED_KEYS.has(row.key)) {
      result[row.key] = row.value;
    }
  }
  return res.json(result);
}

// Keys are short identifiers and values bounded strings; the number of keys
// per request is capped too (admin-only, but defense in depth).
const updateConfigSchema = z
  .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/, "Invalid config key"), z.string().max(2000))
  .refine((o) => Object.keys(o).length <= 50, "Too many keys in one request");

// PUT /api/config  (admin only)
// Body: { [key]: value, ... } — upserts each key. Protected keys (like
// admin_password_hash) are rejected here.
export async function updateConfig(req: Request, res: Response) {
  const parsed = updateConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Body must be a flat key/value object of strings" });
  }

  const entries = Object.entries(parsed.data);
  const rejected = entries.filter(([key]) => PROTECTED_KEYS.has(key));
  if (rejected.length > 0) {
    return res.status(400).json({
      error: `Cannot set protected key(s) via this endpoint: ${rejected.map(([k]) => k).join(", ")}`,
    });
  }

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.config.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  return getConfig(req, res);
}
