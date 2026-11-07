import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// GET /api/customers/search?q=555 or ?q=Jane
// FR-1.5 / FR-1.6: returning-customer lookup by phone number or name, used
// to auto-fill the registration form.
export async function searchCustomers(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    return res.status(400).json({ error: "Query param 'q' is required" });
  }

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { phoneNumber: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    // FR-1.6: auto-fill device brand too, from their most recent ticket.
    include: {
      tickets: {
        orderBy: { registeredAt: "desc" },
        take: 1,
        select: { deviceBrand: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const result = customers.map(({ tickets, ...customer }) => ({
    ...customer,
    lastDeviceBrand: tickets[0]?.deviceBrand ?? null,
  }));

  return res.json(result);
}
