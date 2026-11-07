import { Request, Response } from "express";
import { z } from "zod";
import { Prisma, TicketStatus, RepairStage } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { resolvePrice } from "../lib/pricing";
import { encryptPin } from "../lib/crypto";
import { recalculateQueue } from "../lib/scheduler";
import { generateUniqueTrackingCode } from "../lib/trackingCode";
import { sendReadyForPickupNotification, sendNewBookingNotifications } from "../lib/notifications";
import { sendReadyForPickupTelegramMessage } from "../lib/telegramService";

const ticketInclude = {
  customer: true,
  repairType: true,
  preRepairChecklist: true,
} satisfies Prisma.TicketInclude;

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

// Never leak the encrypted PIN blob over the API; just tell the UI whether
// one is on file.
function serializeTicket(ticket: TicketWithRelations) {
  const { devicePin, ...rest } = ticket;
  return {
    ...rest,
    estimatedCost: Number(ticket.estimatedCost),
    actualCost: ticket.actualCost !== null ? Number(ticket.actualCost) : null,
    hasPin: devicePin !== null,
  };
}

// ---------------------------------------------------------------------------
// POST /api/tickets — registration (FR-1.1 - FR-1.4, FR-3.4)
// ---------------------------------------------------------------------------

const createTicketSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(100),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, "Enter a valid phone number"),
  email: z.string().trim().email().max(254).optional(),
  deviceBrand: z.string().trim().min(1, "Device brand is required").max(60),
  deviceModel: z.string().trim().min(1, "Device model is required").max(100),
  problemDescription: z.string().trim().min(1, "Problem description is required").max(2000),
  repairTypeId: z.number().int().positive(),
  devicePin: z.string().min(1).max(64).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createTicket(req: Request, res: Response) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const data = parsed.data;

  const repairType = await prisma.repairType.findUnique({ where: { id: data.repairTypeId } });
  if (!repairType) {
    return res.status(404).json({ error: "Repair type not found" });
  }

  const price = await resolvePrice(data.repairTypeId, data.deviceBrand);
  if (!price) {
    return res.status(422).json({
      error: "No price configured for this repair type. Ask an admin to set one in Price List settings.",
    });
  }

  // FR-1.5 / FR-1.6: reuse an existing customer record by exact phone match.
  let customer = await prisma.customer.findFirst({ where: { phoneNumber: data.phoneNumber } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: data.name, phoneNumber: data.phoneNumber, email: data.email },
    });
  } else if (data.email && !customer.email) {
    // Backfill email on a returning customer who didn't have one yet.
    customer = await prisma.customer.update({ where: { id: customer.id }, data: { email: data.email } });
  }

  const activeWaitingCount = await prisma.ticket.count({ where: { status: "WAITING" } });
  const trackingCode = await generateUniqueTrackingCode();

  const ticket = await prisma.ticket.create({
    data: {
      customerId: customer.id,
      deviceBrand: data.deviceBrand,
      deviceModel: data.deviceModel,
      repairTypeId: data.repairTypeId,
      problemDescription: data.problemDescription,
      devicePin: data.devicePin ? encryptPin(data.devicePin) : null,
      status: "WAITING",
      estimatedCost: price.basePrice,
      queuePosition: activeWaitingCount + 1,
      notes: data.notes,
      trackingCode,
    },
  });

  await recalculateQueue();

  const full = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });

  // Issue 1: confirm the ticket ID to the client and alert the shop.
  // Failures are swallowed inside the service — never fail the booking
  // itself over a notification hiccup.
  await sendNewBookingNotifications({
    ticketId: full.id,
    trackingCode: full.trackingCode,
    deviceBrand: full.deviceBrand,
    deviceModel: full.deviceModel,
    repairTypeName: full.repairType.name,
    estimatedCost: Number(full.estimatedCost),
    customerName: full.customer.name,
    customerPhone: full.customer.phoneNumber,
    customerEmail: full.customer.email,
  });

  return res.status(201).json({ ...serializeTicket(full), priceSource: price.source });
}

// ---------------------------------------------------------------------------
// GET /api/tickets — live queue (FR-2.1) or filtered history
// ---------------------------------------------------------------------------

export async function listTickets(req: Request, res: Response) {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;

  if (!statusParam) {
    // Default: the live queue — in-progress ticket first, then waiting
    // tickets in queue order.
    const [inProgress, waiting] = await Promise.all([
      prisma.ticket.findMany({ where: { status: "IN_PROGRESS" }, include: ticketInclude }),
      prisma.ticket.findMany({
        where: { status: "WAITING" },
        include: ticketInclude,
        orderBy: { queuePosition: "asc" },
      }),
    ]);
    return res.json([...inProgress, ...waiting].map(serializeTicket));
  }

  const statuses = statusParam.split(",").map((s) => s.trim().toUpperCase()) as TicketStatus[];
  const rows = await prisma.ticket.findMany({
    where: { status: { in: statuses } },
    include: ticketInclude,
    orderBy: { registeredAt: "desc" },
  });
  return res.json(rows.map(serializeTicket));
}

// GET /api/tickets/:id
export async function getTicket(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  return res.json(serializeTicket(ticket));
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/status — FR-2.5, FR-2.6, FR-2.7
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  WAITING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
};

const statusUpdateSchema = z.object({
  status: z.enum(["IN_PROGRESS", "DONE", "COLLECTED"]),
  actualCost: z.number().nonnegative().optional(),
});

export async function updateTicketStatus(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const nextStatus = parsed.data.status;
  if (!ALLOWED_TRANSITIONS[ticket.status].includes(nextStatus)) {
    return res.status(400).json({
      error: `Cannot move ticket from ${ticket.status} to ${nextStatus}`,
    });
  }

  if (nextStatus === "IN_PROGRESS") {
    const alreadyRunning = await prisma.ticket.findFirst({ where: { status: "IN_PROGRESS" } });
    if (alreadyRunning) {
      return res.status(409).json({
        error: `Ticket #${alreadyRunning.id} is already in progress. Finish it before starting another.`,
      });
    }

    // Liability protection: a technician must record the device's
    // pre-repair condition (screen, Touch/FaceID, cameras, charging port)
    // before work starts. Enforced here — not just hidden in the UI — so
    // this can't be skipped by calling the API directly.
    const checklist = await prisma.preRepairChecklist.findUnique({ where: { ticketId: id } });
    if (!checklist) {
      return res.status(400).json({
        error: "Complete the pre-repair checklist before starting this repair.",
      });
    }
  }

  const data: Prisma.TicketUpdateInput = { status: nextStatus };
  if (nextStatus === "IN_PROGRESS") {
    data.startedAt = new Date();
    data.queuePosition = null;
    data.repairStage = "DIAGNOSING";
  }
  if (nextStatus === "DONE") {
    data.completedAt = new Date();
    data.repairStage = "READY_FOR_PICKUP";
    if (parsed.data.actualCost !== undefined) data.actualCost = parsed.data.actualCost;
  }

  await prisma.ticket.update({ where: { id }, data });
  await recalculateQueue();

  const full = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });

  // FR (tracker feature): notify the customer the moment a ticket becomes
  // Ready for Pickup. Notification failures are swallowed inside the
  // service itself so they never fail this request.
  if (nextStatus === "DONE") {
    await sendReadyForPickupNotification({
      ticketId: full.id,
      trackingCode: full.trackingCode,
      deviceBrand: full.deviceBrand,
      deviceModel: full.deviceModel,
      customerName: full.customer.name,
      customerPhone: full.customer.phoneNumber,
      customerEmail: full.customer.email,
    });

    // Telegram: only sendable if this customer has previously linked a chat
    // via the bot's /start deep link (see lib/telegramService.ts) — there's
    // no way to message a phone number or @username directly.
    if (full.customer.telegramChatId) {
      await sendReadyForPickupTelegramMessage({
        telegramChatId: full.customer.telegramChatId,
        ticketId: full.id,
      });
    }
  }

  return res.json(serializeTicket(full));
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/stage — customer-facing tracker sub-stage, within
// an active repair (DIAGNOSING / WAITING_ON_PARTS / REPAIRING). Does NOT
// accept READY_FOR_PICKUP directly — that's only ever set by the DONE
// status transition above, so the notification trigger stays centralized
// and the two fields can't drift out of sync.
// ---------------------------------------------------------------------------

const MANUAL_STAGES = ["DROPPED_OFF", "DIAGNOSING", "WAITING_ON_PARTS", "REPAIRING"] as const;

const stageUpdateSchema = z.object({
  repairStage: z.enum(MANUAL_STAGES),
});

export async function updateRepairStage(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = stageUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error:
        parsed.error.issues[0]?.message ??
        `repairStage must be one of: ${MANUAL_STAGES.join(", ")} (use the /status endpoint for Ready for Pickup)`,
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.status !== "WAITING" && ticket.status !== "IN_PROGRESS") {
    return res.status(400).json({ error: `Cannot change repair stage on a ${ticket.status} ticket` });
  }

  await prisma.ticket.update({
    where: { id },
    data: { repairStage: parsed.data.repairStage as RepairStage },
  });

  const full = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
  return res.json(serializeTicket(full));
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/reorder — FR-2.8 (manual queue reorder)
// ---------------------------------------------------------------------------

const reorderSchema = z.object({
  newPosition: z.number().int().positive(),
});

export async function reorderTicket(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const target = await prisma.ticket.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "Ticket not found" });
  if (target.status !== "WAITING") {
    return res.status(400).json({ error: "Only WAITING tickets can be reordered" });
  }

  const waiting = await prisma.ticket.findMany({
    where: { status: "WAITING" },
    orderBy: { queuePosition: "asc" },
  });

  const withoutTarget = waiting.filter((t) => t.id !== id);
  const insertAt = Math.min(Math.max(parsed.data.newPosition - 1, 0), withoutTarget.length);
  withoutTarget.splice(insertAt, 0, target);

  await prisma.$transaction(
    withoutTarget.map((t, index) =>
      prisma.ticket.update({ where: { id: t.id }, data: { queuePosition: index + 1 } })
    )
  );

  await recalculateQueue();

  const full = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
  return res.json(serializeTicket(full));
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/cancel — FR-2.9
// ---------------------------------------------------------------------------

const cancelSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

export async function cancelTicket(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.status === "CANCELLED" || ticket.status === "COLLECTED") {
    return res.status(400).json({ error: `Cannot cancel a ticket that is already ${ticket.status}` });
  }

  await prisma.ticket.update({
    where: { id },
    data: { status: "CANCELLED", cancellationReason: parsed.data.reason, queuePosition: null },
  });

  await recalculateQueue();

  const full = await prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });
  return res.json(serializeTicket(full));
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id/price — FR-3.6 (technician cost override)
// ---------------------------------------------------------------------------

const priceOverrideSchema = z.object({
  estimatedCost: z.number().nonnegative().optional(),
  actualCost: z.number().nonnegative().optional(),
});

export async function overrideTicketPrice(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = priceOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  if (parsed.data.estimatedCost === undefined && parsed.data.actualCost === undefined) {
    return res.status(400).json({ error: "Provide estimatedCost and/or actualCost" });
  }

  try {
    const updated = await prisma.ticket.update({ where: { id }, data: parsed.data, include: ticketInclude });
    return res.json(serializeTicket(updated));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    throw e;
  }
}
