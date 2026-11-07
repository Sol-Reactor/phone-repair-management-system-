import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// GET /api/admin/analytics — feeds the CEO Analytics Dashboard. Shapes data
// so the frontend can hand each piece straight to recharts with no further
// reshaping (revenueOverTime -> <LineChart data=...>, statusDistribution ->
// <Pie data=...>).
//
// Revenue definition: recognized when money actually changes hands, not
// when work is scheduled/finished. That's COLLECTED tickets (picked up +
// paid) using actualCost if the technician recorded one, else the
// estimatedCost fallback, plus wholesale amountPaid (not totalAmount —
// unpaid balance on a LOAN/PARTIAL distribution isn't revenue yet, it's the
// debt counted separately below).
//
// Outstanding debt: the Ticket model has no partial-payment/debt tracking
// (see DistributionLedger for why wholesale does) — a ticket is either
// unpaid-and-not-yet-collected or fully paid at COLLECTED. So this figure
// is wholesale technician debt only; it is NOT "all money owed to the shop
// across both branches".
export async function getAnalytics(_req: Request, res: Response) {
  const todayLocalMidnight = new Date();
  todayLocalMidnight.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(todayLocalMidnight);
  sevenDaysAgo.setDate(todayLocalMidnight.getDate() - 6); // 7 buckets inclusive of today

  const [collectedTickets, wholesalePaidAgg, debtAgg, activeRepairs, statusCounts] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: "COLLECTED" },
      select: { actualCost: true, estimatedCost: true },
    }),
    prisma.distributionLedger.aggregate({ _sum: { amountPaid: true } }),
    prisma.externalTechnician.aggregate({ _sum: { totalDebt: true } }),
    prisma.ticket.count({ where: { status: { in: ["WAITING", "IN_PROGRESS"] } } }),
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { status: { not: "CANCELLED" } },
    }),
  ]);

  const ticketRevenue = collectedTickets.reduce((sum, t) => sum + Number(t.actualCost ?? t.estimatedCost), 0);
  const wholesaleRevenue = Number(wholesalePaidAgg._sum.amountPaid ?? 0);
  const outstandingDebt = Number(debtAgg._sum.totalDebt ?? 0);

  // --- Revenue over the last 7 days --------------------------------------
  const [recentCollectedTickets, recentLedgerPayments] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: "COLLECTED", completedAt: { gte: sevenDaysAgo } },
      select: { actualCost: true, estimatedCost: true, completedAt: true },
    }),
    prisma.distributionLedger.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { amountPaid: true, createdAt: true },
    }),
  ]);

  // Local calendar-day buckets (not UTC — this is a single-timezone, single
  // shop app, and round-tripping through toISOString() would risk shifting
  // a late-evening sale into the wrong day depending on server timezone).
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const days: { key: string; date: Date; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    days.push({ key: dayKey(date), date, revenue: 0 });
  }
  const bucketsByKey = new Map(days.map((d) => [d.key, d]));

  for (const t of recentCollectedTickets) {
    if (!t.completedAt) continue;
    const bucket = bucketsByKey.get(dayKey(t.completedAt));
    if (bucket) bucket.revenue += Number(t.actualCost ?? t.estimatedCost);
  }
  for (const entry of recentLedgerPayments) {
    const bucket = bucketsByKey.get(dayKey(entry.createdAt));
    if (bucket) bucket.revenue += Number(entry.amountPaid);
  }

  const revenueOverTime = days.map((d) => ({
    date: d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    revenue: Math.round(d.revenue * 100) / 100,
  }));

  // --- Repair status distribution (3 buckets, per the CEO dashboard spec) -
  const bucketed = { droppedOff: 0, inProcess: 0, done: 0 };
  for (const row of statusCounts) {
    if (row.status === "WAITING") bucketed.droppedOff += row._count._all;
    else if (row.status === "IN_PROGRESS") bucketed.inProcess += row._count._all;
    else if (row.status === "DONE" || row.status === "COLLECTED") bucketed.done += row._count._all;
  }

  const statusDistribution = [
    { name: "Dropped Off", value: bucketed.droppedOff },
    { name: "In Process", value: bucketed.inProcess },
    { name: "Done", value: bucketed.done },
  ];

  return res.json({
    stats: {
      totalRevenue: Math.round((ticketRevenue + wholesaleRevenue) * 100) / 100,
      outstandingDebt: Math.round(outstandingDebt * 100) / 100,
      activeRepairs,
    },
    revenueOverTime,
    statusDistribution,
  });
}
