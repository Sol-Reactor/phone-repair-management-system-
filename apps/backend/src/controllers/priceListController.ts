import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { resolvePrice } from "../lib/pricing";

// Prisma's Decimal type serializes to a STRING via JSON.stringify (its
// toJSON returns a string, not a number), so every response touching
// basePrice needs to convert it explicitly or the frontend gets "120.00"
// instead of 120 and things like .toFixed() blow up.
function serializePriceListEntry<T extends { basePrice: Prisma.Decimal }>(entry: T) {
  return { ...entry, basePrice: Number(entry.basePrice) };
}

// GET /api/price-list?repairTypeId=1
export async function listPriceList(req: Request, res: Response) {
  const { repairTypeId } = req.query;
  const where =
    repairTypeId !== undefined ? { repairTypeId: Number(repairTypeId) } : undefined;

  const rows = await prisma.priceList.findMany({
    where,
    include: { repairType: true },
    orderBy: [{ repairTypeId: "asc" }, { deviceBrand: "asc" }],
  });
  return res.json(rows.map(serializePriceListEntry));
}

// GET /api/price-list/:id
export async function getPriceListEntry(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const row = await prisma.priceList.findUnique({ where: { id }, include: { repairType: true } });
  if (!row) return res.status(404).json({ error: "Price list entry not found" });
  return res.json(serializePriceListEntry(row));
}

// GET /api/price-list/lookup?repairTypeId=1&deviceBrand=Samsung
// FR-3.2 / FR-3.4: exact repairType+brand match first, falling back to the
// brand-agnostic default entry (deviceBrand = null) for that repair type.
export async function lookupPrice(req: Request, res: Response) {
  const repairTypeId = Number(req.query.repairTypeId);
  const deviceBrand = typeof req.query.deviceBrand === "string" ? req.query.deviceBrand : undefined;

  if (!Number.isInteger(repairTypeId)) {
    return res.status(400).json({ error: "repairTypeId query param is required" });
  }

  const resolved = await resolvePrice(repairTypeId, deviceBrand);
  if (!resolved) {
    return res.status(404).json({ error: "No price configured for this repair type" });
  }

  return res.json(resolved);
}

const priceListSchema = z.object({
  repairTypeId: z.number().int().positive(),
  deviceBrand: z.string().min(1).nullable().optional(),
  basePrice: z.number().nonnegative(),
});

// POST /api/price-list  (admin only)
export async function createPriceListEntry(req: Request, res: Response) {
  const parsed = priceListSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const repairTypeId = parsed.data.repairTypeId;
  const deviceBrand = parsed.data.deviceBrand ?? null;

  // The DB's @@unique([repairTypeId, deviceBrand]) does NOT catch duplicate
  // default rows (deviceBrand = null), because SQL treats every NULL as
  // distinct for uniqueness purposes. Enforce "one default price per repair
  // type" at the application layer instead.
  if (deviceBrand === null) {
    const existingDefault = await prisma.priceList.findFirst({ where: { repairTypeId, deviceBrand: null } });
    if (existingDefault) {
      return res.status(409).json({
        error: "A default price already exists for this repair type. Edit it instead of creating a new one.",
      });
    }
  }

  try {
    const created = await prisma.priceList.create({
      data: { repairTypeId, deviceBrand, basePrice: parsed.data.basePrice },
    });
    return res.status(201).json(serializePriceListEntry(created));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({
        error: "A price already exists for this repair type + device brand combination",
      });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return res.status(400).json({ error: "repairTypeId does not reference an existing repair type" });
    }
    throw e;
  }
}

// PUT /api/price-list/:id  (admin only)
export async function updatePriceListEntry(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = priceListSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const current = await prisma.priceList.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: "Price list entry not found" });

  const finalRepairTypeId = parsed.data.repairTypeId ?? current.repairTypeId;
  const finalDeviceBrand = "deviceBrand" in parsed.data ? parsed.data.deviceBrand ?? null : current.deviceBrand;

  // Same app-layer guard as create: the DB unique index can't catch
  // duplicate default (deviceBrand = null) rows.
  if (finalDeviceBrand === null) {
    const conflict = await prisma.priceList.findFirst({
      where: { repairTypeId: finalRepairTypeId, deviceBrand: null, NOT: { id } },
    });
    if (conflict) {
      return res.status(409).json({
        error: "A default price already exists for this repair type.",
      });
    }
  }

  try {
    const updated = await prisma.priceList.update({
      where: { id },
      data: parsed.data,
    });
    return res.json(serializePriceListEntry(updated));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Price list entry not found" });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({
        error: "A price already exists for this repair type + device brand combination",
      });
    }
    throw e;
  }
}

// DELETE /api/price-list/:id  (admin only)
export async function deletePriceListEntry(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await prisma.priceList.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Price list entry not found" });
    }
    throw e;
  }
}
