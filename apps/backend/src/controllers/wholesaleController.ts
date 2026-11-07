import { Request, Response } from "express";
import { z } from "zod";
import { Prisma, PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Decimal fields serialize to strings via JSON.stringify (see
// priceListController's serializePriceListEntry for the same issue) — every
// response touching unitPrice/totalDebt/totalAmount/amountPaid/balanceDue
// needs an explicit Number() conversion or the frontend gets "120.00".

function serializeItem<T extends { unitPrice: Prisma.Decimal }>(item: T) {
  return { ...item, unitPrice: Number(item.unitPrice) };
}

function serializeTechnician<T extends { totalDebt: Prisma.Decimal }>(tech: T) {
  return { ...tech, totalDebt: Number(tech.totalDebt) };
}

function serializeLedgerEntry<
  T extends { totalAmount: Prisma.Decimal; amountPaid: Prisma.Decimal; balanceDue: Prisma.Decimal }
>(entry: T) {
  return {
    ...entry,
    totalAmount: Number(entry.totalAmount),
    amountPaid: Number(entry.amountPaid),
    balanceDue: Number(entry.balanceDue),
  };
}

// Thrown inside the $transaction callback to abort with a specific HTTP
// status instead of falling through to the generic 500 handler in index.ts.
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Items — GET /api/admin/wholesale/items, POST /api/admin/wholesale/items
// ---------------------------------------------------------------------------

export async function listItems(_req: Request, res: Response) {
  const items = await prisma.wholesaleItem.findMany({ orderBy: { name: "asc" } });
  return res.json(items.map(serializeItem));
}

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  stockQuantity: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
});

// "Add a Part" is really "add or restock a part": Postgres unique indexes
// are case-sensitive by default, so without this check "iPhone 13 Screen"
// and "iphone 13 screen" would happily create two rows for the same part —
// which is exactly the contradictory duplicate-catalog-entry bug this
// guards against (two stock counts / two prices for one physical part).
// Match on name alone (case-insensitive, trimmed): that's the part's real
// identity — category is just a tag and shouldn't be able to fork it.
export async function createItem(req: Request, res: Response) {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const name = parsed.data.name.trim();
  const category = parsed.data.category.trim();

  const existing = await prisma.wholesaleItem.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    // Restock: add to the existing count instead of forking a duplicate
    // row. Category/price are treated as corrections from this submission
    // (an admin re-adding "iPhone 13 Screen" almost always means "here's
    // more stock, at today's price"), not a new, separate line item.
    const merged = await prisma.wholesaleItem.update({
      where: { id: existing.id },
      data: {
        category,
        unitPrice: parsed.data.unitPrice,
        stockQuantity: { increment: parsed.data.stockQuantity },
      },
    });
    return res.status(200).json({ ...serializeItem(merged), merged: true });
  }

  const created = await prisma.wholesaleItem.create({
    data: { ...parsed.data, name, category },
  });
  return res.status(201).json({ ...serializeItem(created), merged: false });
}

// DELETE /api/admin/wholesale/items/:id
// Only zero-stock items are deletable — this is meant for clearing out
// duplicate/dead catalog rows (like the pre-fix "same part, two rows" bug),
// not for writing off parts that are still sitting on the shelf. If stock
// somehow needs zeroing out first, that's a separate, deliberate action.
export async function deleteItem(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const item = await prisma.wholesaleItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: "Wholesale item not found" });
  if (item.stockQuantity !== 0) {
    return res.status(400).json({ error: "Only items with zero stock can be deleted" });
  }

  try {
    await prisma.wholesaleItem.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Wholesale item not found" });
    }
    // FK constraint — this item still has DistributionLedger history.
    // Deleting it would either fail or silently orphan that ledger data, so
    // refuse instead. (The row itself has 0 stock, so it's harmless to keep
    // around; it just can't be purged from a table that references it.)
    //
    // Postgres uses two different error codes for FK protection: 23503
    // (NO ACTION, checked at end-of-statement) comes back from Prisma as a
    // structured P2003 error, but 23001 (RESTRICT — what Prisma generates
    // by default for relation fields, and what actually fires here) is
    // raised immediately by Postgres itself and arrives as an *unstructured*
    // PrismaClientUnknownRequestError. Match on the message, not just
    // error.code, so both cases are caught.
    const message = e instanceof Error ? e.message : "";
    const isForeignKeyViolation =
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") ||
      /foreign key constraint/i.test(message);
    if (isForeignKeyViolation) {
      return res.status(409).json({
        error: "This item has distribution history and can't be deleted",
      });
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Technicians — GET /api/admin/wholesale/technicians, POST .../technicians
// ---------------------------------------------------------------------------

export async function listTechnicians(_req: Request, res: Response) {
  const technicians = await prisma.externalTechnician.findMany({ orderBy: { name: "asc" } });
  return res.json(technicians.map(serializeTechnician));
}

const technicianSchema = z.object({
  name: z.string().min(1, "Technician name is required"),
  phone: z.string().min(1, "Phone number is required"),
  shopLocation: z.string().min(1, "Shop location is required"),
});

export async function createTechnician(req: Request, res: Response) {
  const parsed = technicianSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const created = await prisma.externalTechnician.create({ data: { ...parsed.data, totalDebt: 0 } });
  return res.status(201).json(serializeTechnician(created));
}

// ---------------------------------------------------------------------------
// Debtors — GET /api/admin/wholesale/debtors
// Only technicians who currently owe money, worst offenders first, so the
// admin can work down the list and start calling.
// ---------------------------------------------------------------------------

export async function listDebtors(_req: Request, res: Response) {
  const debtors = await prisma.externalTechnician.findMany({
    where: { totalDebt: { gt: 0 } },
    orderBy: { totalDebt: "desc" },
  });
  return res.json(debtors.map(serializeTechnician));
}

// ---------------------------------------------------------------------------
// Ledger — GET /api/admin/wholesale/ledger
// ---------------------------------------------------------------------------

export async function listLedger(req: Request, res: Response) {
  const take = req.query.take ? Number(req.query.take) : 100;
  const entries = await prisma.distributionLedger.findMany({
    include: { wholesaleItem: true, externalTechnician: true },
    orderBy: { createdAt: "desc" },
    take: Number.isInteger(take) && take > 0 ? Math.min(take, 500) : 100,
  });
  return res.json(entries.map(serializeLedgerEntry));
}

// GET /api/admin/wholesale/ledger/:id — single distribution, for the
// printable receipt view (PrintableReceipt / WholesaleReceiptPage).
export async function getLedgerEntry(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const entry = await prisma.distributionLedger.findUnique({
    where: { id },
    include: { wholesaleItem: true, externalTechnician: true },
  });
  if (!entry) return res.status(404).json({ error: "Distribution not found" });
  return res.json(serializeLedgerEntry(entry));
}

// ---------------------------------------------------------------------------
// POST /api/admin/wholesale/distribute — the core POS action.
//
// Either pass an existing externalTechnicianId, or newTechnician details to
// create one on the fly (the "select/add" requirement from the Distribute
// Part tab). Runs as a single prisma.$transaction so the stock decrement,
// ledger row, and technician debt update either all happen or none do.
// ---------------------------------------------------------------------------

const distributeSchema = z
  .object({
    wholesaleItemId: z.number().int().positive(),
    externalTechnicianId: z.number().int().positive().optional(),
    newTechnician: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(1),
        shopLocation: z.string().min(1),
      })
      .optional(),
    quantityTaken: z.number().int().positive(),
    amountPaid: z.number().nonnegative(),
  })
  .refine((data) => data.externalTechnicianId !== undefined || data.newTechnician !== undefined, {
    message: "Provide either externalTechnicianId or newTechnician",
  });

export async function createDistribution(req: Request, res: Response) {
  const parsed = distributeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1a. Load the part and make sure there's enough stock to give out.
      const item = await tx.wholesaleItem.findUnique({ where: { id: data.wholesaleItemId } });
      if (!item) throw new HttpError(404, "Wholesale item not found");
      if (item.stockQuantity < data.quantityTaken) {
        throw new HttpError(422, `Only ${item.stockQuantity} in stock — cannot distribute ${data.quantityTaken}`);
      }

      // 1b. Resolve the technician: reuse an existing one, or create it now.
      const technician = data.externalTechnicianId
        ? await tx.externalTechnician.findUnique({ where: { id: data.externalTechnicianId } })
        : await tx.externalTechnician.create({ data: { ...data.newTechnician!, totalDebt: 0 } });
      if (!technician) throw new HttpError(404, "External technician not found");

      // Money math done in Prisma.Decimal, not floating point, to avoid
      // cent-level rounding drift on the debt ledger.
      const totalAmount = item.unitPrice.mul(data.quantityTaken);
      const amountPaid = new Prisma.Decimal(data.amountPaid);
      if (amountPaid.gt(totalAmount)) {
        throw new HttpError(400, "Amount paid cannot exceed the total amount for this transaction");
      }
      const balanceDue = totalAmount.sub(amountPaid);
      const paymentStatus: PaymentStatus = balanceDue.eq(0)
        ? "PAID"
        : amountPaid.gt(0)
          ? "PARTIAL"
          : "LOAN";

      // 2. Decrease stock.
      await tx.wholesaleItem.update({
        where: { id: item.id },
        data: { stockQuantity: { decrement: data.quantityTaken } },
      });

      // 3. Create the ledger entry.
      const ledgerEntry = await tx.distributionLedger.create({
        data: {
          wholesaleItemId: item.id,
          externalTechnicianId: technician.id,
          quantityTaken: data.quantityTaken,
          totalAmount,
          amountPaid,
          balanceDue,
          paymentStatus,
        },
        include: { wholesaleItem: true, externalTechnician: true },
      });

      // 4. Update the technician's running debt.
      await tx.externalTechnician.update({
        where: { id: technician.id },
        data: { totalDebt: { increment: balanceDue } },
      });

      return ledgerEntry;
    }, {
      // Neon's free-tier compute auto-suspends after a few minutes idle.
      // The first query of this transaction can trigger a cold start that
      // takes several seconds to resume — comfortably longer than Prisma's
      // default 5s `timeout`/2s `maxWait`. When that default elapsed,
      // Prisma silently closed/rolled back the transaction, then the next
      // query in the callback failed with P2028 ("transaction not found")
      // because there was nothing left to run it against. Raising both
      // gives the cold start room to finish before Prisma gives up.
      maxWait: 15000,
      timeout: 20000,
    });

    return res.status(201).json(serializeLedgerEntry(result));
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.status).json({ error: e.message });
    }
    throw e;
  }
}
