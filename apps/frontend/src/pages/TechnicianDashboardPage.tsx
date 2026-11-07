import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { Ticket, ScreenCondition } from "../lib/types";
import { useLanguage } from "../lib/i18n";
import { Button, Card, ErrorText, StatusBadge } from "../components/ui";
import { ChecklistForm } from "../components/ChecklistForm";

// ---------------------------------------------------------------------------
// Technician Operations Dashboard — Kanban view of the repair queue, built
// around the liability-protection workflow: a WAITING ticket without a
// saved checklist opens the ChecklistForm modal instead of starting the
// repair directly. The actual gate is server-side (PATCH /status 400s
// without a checklist on file) — this page is just the fast, guided path
// to satisfying it.
//
// Reuses the same single staff-login tier as the rest of the internal app
// (see App.tsx / RequireAdmin) — there's no separate "technician" role in
// this codebase, by earlier design (Issue 3).
// ---------------------------------------------------------------------------

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-800 dark:text-white">#{ticket.id} {ticket.customer.name}</span>
        {ticket.status === "WAITING" &&
          (ticket.preRepairChecklist ? (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5 shrink-0 dark:bg-emerald-500/10 dark:text-emerald-400">
              {t("admin.technician.checklistDone")}
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 shrink-0 dark:bg-amber-500/10 dark:text-amber-400">
              {t("admin.technician.needsChecklist")}
            </span>
          ))}
      </div>
      <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
        {ticket.deviceBrand} {ticket.deviceModel} · {ticket.repairType.name}
      </p>
      <p className="text-xs text-slate-500 mt-2 dark:text-slate-500">
        {ticket.status === "WAITING"
          ? t("admin.technician.droppedOffAt", { time: formatTime(ticket.registeredAt) })
          : ticket.status === "IN_PROGRESS"
          ? t("admin.technician.startedAt", { time: formatTime(ticket.startedAt) })
          : t("admin.technician.readySince", { time: formatTime(ticket.completedAt) })}
      </p>
    </button>
  );
}

function Column({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex-1 min-w-0 dark:bg-slate-800/40 dark:border-slate-700">
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide dark:text-slate-300">{title}</h2>
        <span className="text-xs font-medium text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
          {count}
        </span>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

export function TechnicianDashboardPage() {
  const { t } = useLanguage();
  const SCREEN_LABELS: Record<ScreenCondition, string> = {
    PERFECT: t("admin.checklist.screenPerfect"),
    SCRATCHED: t("admin.checklist.screenScratched"),
    CRACKED: t("admin.checklist.screenCracked"),
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [done, setDone] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // The ticket currently shown in the checklist modal (brand-new start).
  const [checklistTicket, setChecklistTicket] = useState<Ticket | null>(null);
  // The ticket currently shown in the read-only detail panel.
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    try {
      const [active, doneData] = await Promise.all([
        api.get<Ticket[]>("/tickets"),
        api.get<Ticket[]>("/tickets?status=DONE"),
      ]);
      setTickets(active);
      setDone(doneData);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.technician.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const droppedOff = tickets
    .filter((t2) => t2.status === "WAITING")
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
  const inProcess = tickets.filter((t2) => t2.status === "IN_PROGRESS");
  const anyInProgress = inProcess.length > 0;

  const handleCardClick = (ticket: Ticket) => {
    if (ticket.status === "WAITING" && !ticket.preRepairChecklist) {
      setChecklistTicket(ticket);
    } else {
      setDetailTicket(ticket);
    }
  };

  const withBusy = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.technician.actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = (id: number) =>
    withBusy(id, async () => {
      await api.patch(`/tickets/${id}/status`, { status: "IN_PROGRESS" });
      setDetailTicket(null);
    });

  const handleComplete = (id: number) => {
    const input = window.prompt(t("admin.technician.actualCostPrompt"));
    if (input === null) return;
    const actualCost = input.trim() === "" ? undefined : Number(input);
    withBusy(id, async () => {
      await api.patch(`/tickets/${id}/status`, { status: "DONE", actualCost });
      setDetailTicket(null);
    });
  };

  const handleCollect = (id: number) =>
    withBusy(id, async () => {
      await api.patch(`/tickets/${id}/status`, { status: "COLLECTED" });
      setDetailTicket(null);
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.technician.title")}</h1>
        <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span>{t("admin.technician.droppedOffCount", { count: String(droppedOff.length) })}</span>
          <span>{t("admin.technician.inProcessCount", { count: String(inProcess.length) })}</span>
          <span>{t("admin.technician.readyCount", { count: String(done.length) })}</span>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <Column title={t("admin.technician.droppedOff")} count={droppedOff.length}>
          {droppedOff.length === 0 ? (
            <p className="text-sm text-slate-500 px-1 py-4 dark:text-slate-500">{t("admin.technician.nothingWaiting")}</p>
          ) : (
            droppedOff.map((t2) => <TicketCard key={t2.id} ticket={t2} onClick={() => handleCardClick(t2)} />)
          )}
        </Column>

        <Column title={t("admin.technician.inProcess")} count={inProcess.length}>
          {inProcess.length === 0 ? (
            <p className="text-sm text-slate-500 px-1 py-4 dark:text-slate-500">{t("admin.technician.noActiveRepair")}</p>
          ) : (
            inProcess.map((t2) => <TicketCard key={t2.id} ticket={t2} onClick={() => handleCardClick(t2)} />)
          )}
        </Column>

        <Column title={t("admin.technician.readyForPickup")} count={done.length}>
          {done.length === 0 ? (
            <p className="text-sm text-slate-500 px-1 py-4 dark:text-slate-500">{t("admin.technician.nothingReady")}</p>
          ) : (
            done.map((t2) => <TicketCard key={t2.id} ticket={t2} onClick={() => handleCardClick(t2)} />)
          )}
        </Column>
      </div>

      {checklistTicket && (
        <ChecklistForm
          ticket={checklistTicket}
          onClose={() => setChecklistTicket(null)}
          onStarted={() => {
            setChecklistTicket(null);
            load();
          }}
        />
      )}

      {detailTicket && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">
                  #{detailTicket.id} {detailTicket.customer.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {detailTicket.deviceBrand} {detailTicket.deviceModel} · {detailTicket.repairType.name}
                </p>
              </div>
              <StatusBadge status={detailTicket.status} />
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 mb-4 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1 dark:text-slate-500">
                {t("admin.technician.problem")}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                {detailTicket.problemDescription}
              </p>
            </div>

            {detailTicket.preRepairChecklist ? (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4 space-y-1 dark:bg-blue-500/10 dark:border-blue-500/20">
                <p className="text-xs uppercase tracking-wide text-blue-600 mb-1.5 dark:text-blue-400">
                  {t("admin.technician.checklistTitle")}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t("admin.technician.screenLabel", {
                    value: SCREEN_LABELS[detailTicket.preRepairChecklist.screenCondition],
                  })}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t("admin.technician.touchLabel", {
                    value: detailTicket.preRepairChecklist.touchFaceIdWorking
                      ? t("admin.technician.working")
                      : t("admin.technician.notWorking"),
                  })}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t("admin.technician.camerasLabel", {
                    value: detailTicket.preRepairChecklist.camerasWorking
                      ? t("admin.technician.working")
                      : t("admin.technician.notWorking"),
                  })}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {t("admin.technician.chargingLabel", {
                    value: detailTicket.preRepairChecklist.chargingPortWorking
                      ? t("admin.technician.working")
                      : t("admin.technician.notWorking"),
                  })}
                </p>
                {detailTicket.preRepairChecklist.technicianNotes && (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap pt-1 border-t border-blue-100 mt-2 dark:text-slate-400 dark:border-blue-500/20">
                    {detailTicket.preRepairChecklist.technicianNotes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mb-4 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">
                {t("admin.technician.noChecklistYet")}
              </p>
            )}

            <ErrorText>{error}</ErrorText>

            <div className="flex items-center justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setDetailTicket(null)}>
                {t("admin.technician.close")}
              </Button>
              {detailTicket.status === "WAITING" && detailTicket.preRepairChecklist && (
                <Button
                  disabled={busyId === detailTicket.id || anyInProgress}
                  title={anyInProgress ? t("admin.technician.finishCurrentFirst") : undefined}
                  onClick={() => handleStart(detailTicket.id)}
                >
                  {t("admin.technician.startRepair")}
                </Button>
              )}
              {detailTicket.status === "IN_PROGRESS" && (
                <Button disabled={busyId === detailTicket.id} onClick={() => handleComplete(detailTicket.id)}>
                  {t("admin.technician.markDone")}
                </Button>
              )}
              {detailTicket.status === "DONE" && (
                <Button disabled={busyId === detailTicket.id} onClick={() => handleCollect(detailTicket.id)}>
                  {t("admin.technician.markCollected")}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
