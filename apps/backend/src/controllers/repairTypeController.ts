import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// GET /api/repair-types
export async function listRepairTypes(_req: Request, res: Response) {
  const types = await prisma.repairType.findMany({ orderBy: { name: "asc" } });
  return res.json(types);
}

// GET /api/repair-types/:id
export async function getRepairType(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const type = await prisma.repairType.findUnique({ where: { id } });
  if (!type) return res.status(404).json({ error: "Repair type not found" });
  return res.json(type);
}

const repairTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  estimatedDurationMinutes: z.number().int().positive("Duration must be a positive number of minutes"),
});

// POST /api/repair-types  (admin only)
export async function createRepairType(req: Request, res: Response) {
  const parsed = repairTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  try {
    const created = await prisma.repairType.create({ data: parsed.data });
    return res.status(201).json(created);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "A repair type with this name already exists" });
    }
    throw e;
  }
}

// PUT /api/repair-types/:id  (admin only)
export async function updateRepairType(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = repairTypeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  try {
    const updated = await prisma.repairType.update({ where: { id }, data: parsed.data });
    return res.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Repair type not found" });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "A repair type with this name already exists" });
    }
    throw e;
  }
}

// DELETE /api/repair-types/:id  (admin only)
export async function deleteRepairType(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await prisma.repairType.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Repair type not found" });
    }

    // A RESTRICT-violation delete (blocked because tickets/prices still
    // reference this row) does NOT come back as a PrismaClientKnownRequestError
    // with code P2003 — Postgres raises it as a raw connector error, which
    // Prisma wraps as PrismaClientUnknownRequestError with no `.code` at all.
    // Detect it from the message instead.
    const isKnownFkError = e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014");
    const isUnknownFkError =
      e instanceof Prisma.PrismaClientUnknownRequestError &&
      /foreign key|violates|restrict/i.test(e.message);

    if (isKnownFkError || isUnknownFkError) {
      return res.status(409).json({
        error: "Cannot delete: this repair type is referenced by existing tickets or prices.",
      });
    }
    throw e;
  }
}
