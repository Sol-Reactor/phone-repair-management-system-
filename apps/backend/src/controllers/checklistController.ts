import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Pre-Repair Checklist — liability protection (see schema.prisma comment on
// PreRepairChecklist). A technician records the device's condition on
// arrival BEFORE the ticket is allowed to move WAITING -> IN_PROGRESS; that
// gate lives in updateTicketStatus (ticketController.ts), not here, so it
// can't be bypassed by skipping this endpoint.
//
// Upsert, not create-only: a technician can revise the checklist (typo,
// missed a check) any time before the ticket is finished, without a second
// "edit" endpoint.
// ---------------------------------------------------------------------------

const checklistSchema = z.object({
  screenCondition: z.enum(["SCRATCHED", "CRACKED", "PERFECT"]),
  touchFaceIdWorking: z.boolean(),
  camerasWorking: z.boolean(),
  chargingPortWorking: z.boolean(),
  technicianNotes: z.string().optional(),
});

export async function saveChecklist(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = checklistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  // A finished ticket's checklist is a historical record — don't let it be
  // rewritten after the fact.
  if (ticket.status !== "WAITING" && ticket.status !== "IN_PROGRESS") {
    return res.status(400).json({ error: `Cannot record a checklist on a ${ticket.status} ticket` });
  }

  // `?? null` (not left as undefined) so that re-submitting the checklist
  // with the notes field cleared actually clears it — Prisma treats
  // `undefined` as "leave unchanged" on update, which would otherwise trap
  // a stale note on the record.
  const data: Prisma.PreRepairChecklistUncheckedCreateInput = {
    ticketId: id,
    screenCondition: parsed.data.screenCondition,
    touchFaceIdWorking: parsed.data.touchFaceIdWorking,
    camerasWorking: parsed.data.camerasWorking,
    chargingPortWorking: parsed.data.chargingPortWorking,
    technicianNotes: parsed.data.technicianNotes ?? null,
  };

  const checklist = await prisma.preRepairChecklist.upsert({
    where: { ticketId: id },
    create: data,
    update: {
      screenCondition: data.screenCondition,
      touchFaceIdWorking: data.touchFaceIdWorking,
      camerasWorking: data.camerasWorking,
      chargingPortWorking: data.chargingPortWorking,
      technicianNotes: data.technicianNotes,
    },
  });

  return res.status(200).json(checklist);
}
