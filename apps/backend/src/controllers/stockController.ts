import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Advanced Stock Management — inbound restocking, defective/waste tracking,
// and the low-stock shopping list. All operate on the same WholesaleItem
// catalog the (outbound) wholesale distribution module sells from.

// Decimal fields serialize to strings via JSON.stringify — same issue as
// every other controller touching Prisma Decimal columns (see
// priceListController/wholesaleController for the same pattern).
function serializeItemForStock<T extends { unitPrice: Prisma.Decimal }>(item: T) {
  return { ...item, unitPrice: Number(item.unitPrice) };
}

const restockInclude = { wholesaleItem: true, supplier: true } satisfies Prisma.RestockLogInclude;
type RestockLogWithRelations = Prisma.RestockLogGetPayload<{ include: typeof restockInclude }>;

function serializeRestockLog(entry: RestockLogWithRelations) {
  return {
    ...entry,
    unitCostPrice: Number(entry.unitCostPrice),
    totalCost: Number(entry.totalCost),
    wholesaleItem: serializeItemForStock(entry.wholesaleItem),
  };
}

const defectiveInclude = { wholesaleItem: true } satisfies Prisma.DefectiveLogInclude;
type DefectiveLogWithRelations = Prisma.DefectiveLogGetPayload<{ include: typeof defectiveInclude }>;

function serializeDefectiveLog(entry: DefectiveLogWithRelations) {
  return { ...entry, wholesaleItem: serializeItemForStock(entry.wholesaleItem) };
}

// Thrown inside $transaction callbacks to abort with a specific HTTP status
// instead of falling through to the generic 500 handler — same pattern as
// wholesaleController's local HttpError (not shared/exported from there;
// small enough to duplicate rather than introduce a cross-controller import).
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Suppliers — GET /api/admin/stock/suppliers, POST .../suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers(_req: Request, res: Response) {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return res.json(suppliers);
}

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  phone: z.string().min(1, "Phone number is required"),
  location: z.string().min(1, "Location is required"),
});

export async function createSupplier(req: Request, res: Response) {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const created = await prisma.supplier.create({ data: parsed.data });
  return res.status(201).json(created);
}

// ---------------------------------------------------------------------------
// POST /api/admin/stock/restock — inbound stock. Either pass an existing
// supplierId, or newSupplier details to create one on the fly (same
// select-or-add pattern as wholesaleController.createDistribution's
// technician field). Transaction: increment stock + create the log row
// together, so a crash mid-way can never leave stock bumped without a
// matching audit row (or vice versa).
// ---------------------------------------------------------------------------

const restockSchema = z
  .object({
    wholesaleItemId: z.number().int().positive(),
    supplierId: z.number().int().positive().optional(),
    newSupplier: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(1),
        location: z.string().min(1),
      })
      .optional(),
    quantityAdded: z.number().int().positive(),
    unitCostPrice: z.number().nonnegative(),
  })
  .refine((data) => data.supplierId !== undefined || data.newSupplier !== undefined, {
    message: "Provide either supplierId or newSupplier",
  });

export async function restockItem(req: Request, res: Response) {
  const parsed = restockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.wholesaleItem.findUnique({ where: { id: data.wholesaleItemId } });
      if (!item) throw new HttpError(404, "Wholesale item not found");

      const supplier = data.supplierId
        ? await tx.supplier.findUnique({ where: { id: data.supplierId } })
        : await tx.supplier.create({ data: data.newSupplier! });
      if (!supplier) throw new HttpError(404, "Supplier not found");

      // Cost math in Prisma.Decimal, not floating point — same reasoning as
      // the distribution transaction's totalAmount/balanceDue.
      const unitCostPrice = new Prisma.Decimal(data.unitCostPrice);
      const totalCost = unitCostPrice.mul(data.quantityAdded);

      await tx.wholesaleItem.update({
        where: { id: item.id },
        data: { stockQuantity: { increment: data.quantityAdded } },
      });

      return tx.restockLog.create({
        data: {
          wholesaleItemId: item.id,
          supplierId: supplier.id,
          quantityAdded: data.quantityAdded,
          unitCostPrice,
          totalCost,
        },
        include: restockInclude,
      });
    });

    return res.status(201).json(serializeRestockLog(result));
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/stock/defective — the "waste bin". Transaction: refuse to
// decrement below zero (can't report more broken than is actually in
// stock), decrement stock + create the log together.
// ---------------------------------------------------------------------------

const defectiveSchema = z.object({
  wholesaleItemId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  reason: z.string().min(1, "Reason is required"),
  reportedBy: z.string().min(1, "Enter the name of whoever is reporting this"),
});

export async function reportDefective(req: Request, res: Response) {
  const parsed = defectiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.wholesaleItem.findUnique({ where: { id: data.wholesaleItemId } });
      if (!item) throw new HttpError(404, "Wholesale item not found");
      if (item.stockQuantity < data.quantity) {
        throw new HttpError(
          422,
          `Only ${item.stockQuantity} in stock — cannot report ${data.quantity} as defective`
        );
      }

      await tx.wholesaleItem.update({
        where: { id: item.id },
        data: { stockQuantity: { decrement: data.quantity } },
      });

      return tx.defectiveLog.create({
        data: {
          wholesaleItemId: item.id,
          quantity: data.quantity,
          reason: data.reason,
          reportedBy: data.reportedBy,
        },
        include: defectiveInclude,
      });
    });

    return res.status(201).json(serializeDefectiveLog(result));
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}

// GET /api/admin/stock/defective — full history, newest first. The frontend
// splits this into "waiting for refund" vs "refunded" rather than the API
// forcing a status filter, since the Defective/Returns tab wants to show
// both (one prominent, one collapsed) without a second round-trip.
export async function listDefective(_req: Request, res: Response) {
  const rows = await prisma.defectiveLog.findMany({
    include: defectiveInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows.map(serializeDefectiveLog));
}

// PATCH /api/admin/stock/defective/:id/refund — closes the loop once the
// owner has actually taken the broken part back to the supplier.
export async function markDefectiveRefunded(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const updated = await prisma.defectiveLog.update({
      where: { id },
      data: { status: "REFUNDED" },
      include: defectiveInclude,
    });
    return res.json(serializeDefectiveLog(updated));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Defective log entry not found" });
    }
    throw e;
  }
}

// GET /api/admin/stock/low — the Smart Shopping List. Filtered in
// application code, not a Prisma `where` clause: Prisma can't compare two
// columns of the same row (stockQuantity <= minStockLevel) without dropping
// to raw SQL, and this catalog is small enough that fetching-then-filtering
// is simpler and plenty fast.
export async function lowStock(_req: Request, res: Response) {
  const items = await prisma.wholesaleItem.findMany({ orderBy: { stockQuantity: "asc" } });

  const low = items
    .filter((item) => item.stockQuantity <= item.minStockLevel)
    .map((item) => ({
      ...serializeItemForStock(item),
      // How many to buy to get back to the minimum — at least 1, so an
      // item sitting exactly at 0/0 still shows a sane suggestion.
      suggestedReorderQty: Math.max(item.minStockLevel - item.stockQuantity, 1),
    }));

  return res.json(low);
}
