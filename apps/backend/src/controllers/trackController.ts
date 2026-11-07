import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// GET /api/track/:trackingCode — PUBLIC, no auth, no ticket-ID enumeration
// risk (trackingCode is a random 6-char code, not the sequential `id`).
//
// Deliberately returns the bare minimum: device brand/model, the
// customer-facing repair stage, and an estimated time. NOT the customer's
// name, phone, email, problem description, PIN, or cost — anyone with the
// code (e.g. someone who found a dropped slip) should learn "here's how
// your repair is going," nothing about who the customer is.
const NOT_FOUND_MESSAGE = "Ticket not found. Please check your ID.";
const TRACKING_CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;

export async function trackTicket(req: Request, res: Response) {
  const trackingCode = req.params.trackingCode?.trim().toUpperCase() ?? "";
  // Reject anything that cannot be a real code (same alphabet/length as
  // lib/trackingCode.ts) before touching the database.
  if (!TRACKING_CODE_RE.test(trackingCode)) {
    return res.status(404).json({ error: NOT_FOUND_MESSAGE });
  }

  // Wrapped defensively: this is a public, unauthenticated endpoint, so any
  // unexpected error (a transient DB hiccup, a malformed code, etc.) should
  // still come back as a clean, friendly 404 — never a raw 500 with
  // internal details leaked to an anonymous caller. The real error is still
  // logged server-side so it's not lost for debugging.
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { trackingCode },
      select: {
        deviceBrand: true,
        deviceModel: true,
        status: true,
        repairStage: true,
        estimatedStartTime: true,
        registeredAt: true,
        repairType: { select: { name: true } },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: NOT_FOUND_MESSAGE });
    }

    return res.json({
      deviceBrand: ticket.deviceBrand,
      deviceModel: ticket.deviceModel,
      repairType: ticket.repairType.name,
      status: ticket.status,
      repairStage: ticket.repairStage,
      estimatedStartTime: ticket.estimatedStartTime,
      registeredAt: ticket.registeredAt,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[track] Lookup failed:", err);
    return res.status(404).json({ error: NOT_FOUND_MESSAGE });
  }
}
