import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendContactReplyEmail } from "../lib/notifications";

function serialize(m: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  replyText: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    reference: `C-${m.id}`,
    name: m.name,
    email: m.email,
    phone: m.phone,
    message: m.message,
    status: m.status,
    replyText: m.replyText,
    repliedAt: m.repliedAt,
    createdAt: m.createdAt,
  };
}

// Length caps bound storage and stop the public form being used to dump
// huge payloads into the admin inbox.
const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Enter a valid phone number")
    .optional(),
  message: z.string().trim().min(1, "Message is required").max(5000, "Message is too long (max 5000 characters)"),
});

// POST /api/contact — PUBLIC. Step 1 of the workflow: saved as UNREAD.
export async function submitContactMessage(req: Request, res: Response) {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const created = await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
      // status defaults to UNREAD at the DB level.
    },
  });

  return res.status(201).json({
    reference: `C-${created.id}`,
    createdAt: created.createdAt,
  });
}

// GET /api/contact — admin only. List view for the inbox (left pane) — does
// NOT mark anything as read; that only happens when a specific message is
// opened via GET /api/contact/:id.
export async function listContactMessages(_req: Request, res: Response) {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return res.json(messages.map(serialize));
}

// GET /api/contact/:id — admin only. Step 2/3 of the workflow: opening a
// message is what flips UNREAD -> READ. Never downgrades REPLIED back to
// READ, and doesn't touch an already-READ message either.
export async function getContactMessage(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Message not found" });

  const message =
    existing.status === "UNREAD"
      ? await prisma.contactMessage.update({ where: { id }, data: { status: "READ" } })
      : existing;

  return res.json(serialize(message));
}

const replySchema = z.object({
  replyText: z.string().trim().min(1, "Reply text is required").max(10000),
});

// POST /api/contact/:id/reply — admin only. Step 3 of the workflow: saves
// the admin's reply, marks the message REPLIED, and emails the customer.
// The DB write happens first and always succeeds even if the email send
// fails (email failures are swallowed inside sendContactReplyEmail's
// underlying sendPlainEmail, same pattern as every other notification in
// this app) — an admin should never lose their typed reply over an SMTP hiccup.
export async function replyToContactMessage(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  let updated;
  try {
    updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        replyText: parsed.data.replyText,
        status: "REPLIED",
        repliedAt: new Date(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ error: "Message not found" });
    }
    throw e;
  }

  await sendContactReplyEmail({
    customerName: updated.name,
    customerEmail: updated.email,
    originalMessage: updated.message,
    replyText: updated.replyText as string,
  });

  return res.json(serialize(updated));
}
