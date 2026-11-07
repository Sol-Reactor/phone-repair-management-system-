import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { Ticket } from "../lib/types";
import { useLanguage } from "../lib/i18n";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button, Card, ErrorText, matchesQuery, NoMatches, SearchInput, StatusBadge } from "../components/ui";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const { t } = useLanguage();
  const [queue, setQueue] = useState<Ticket[]>([]);
  const [done, setDone] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [queueData, doneData] = await Promise.all([
        api.get<Ticket[]>("/tickets"),
        api.get<Ticket[]>("/tickets?status=DONE"),
      ]);
      setQueue(queueData);
      setDone(doneData);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.dashboard.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    load();
    // FR-2.1: "real-time" queue view — poll rather than a websocket, simple
    // and sufficient for a single-shop, single-workstation app.
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const withBusy = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.dashboard.actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const inProgress = queue.find((t) => t.status === "IN_PROGRESS");
  const waiting = queue.filter((t) => t.status === "WAITING").sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
  // Filtering only changes what's shown — move up/down still works on the
  // real queue positions (see the disabled checks below, which use `waiting`).
  const shownWaiting = waiting.filter((t2) =>
    matchesQuery(
      query,
      t2.customer.name,
      t2.customer.phoneNumber,
      t2.deviceBrand,
      t2.deviceModel,
      t2.repairType.name,
      t2.trackingCode,
      t2.id
    )
  );

  const handleStart = (id: number) => withBusy(id, () => api.patch(`/tickets/${id}/status`, { status: "IN_PROGRESS" }));

  const handleComplete = (id: number) => {
    const input = window.prompt(t("admin.dashboard.actualCostPrompt"));
    if (input === null) return;
    const actualCost = input.trim() === "" ? undefined : Number(input);
    withBusy(id, () => api.patch(`/tickets/${id}/status`, { status: "DONE", actualCost }));
  };

  const handleCollect = (id: number) => withBusy(id, () => api.patch(`/tickets/${id}/status`, { status: "COLLECTED" }));

  const handleCancel = (id: number) => {
    const reason = window.prompt(t("admin.dashboard.cancelReasonPrompt"));
    if (!reason) return;
    withBusy(id, () => api.patch(`/tickets/${id}/cancel`, { reason }));
  };

  const handleMove = (id: number, currentPosition: number, direction: -1 | 1) => {
    const newPosition = currentPosition + direction;
    if (newPosition < 1) return;
    withBusy(id, () => api.patch(`/tickets/${id}/reorder`, { newPosition }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.dashboard.title")}</h1>
        <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span>{t("admin.dashboard.waitingCount", { count: String(waiting.length) })}</span>
          <span>{t("admin.dashboard.inProgressCount", { count: inProgress ? "1" : "0" })}</span>
          <span>{t("admin.dashboard.readyCount", { count: String(done.length) })}</span>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <Card>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">
          {t("admin.dashboard.nowRepairing")}
        </h2>
        {inProgress ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">
                #{inProgress.id} — {inProgress.customer.name} · {inProgress.deviceBrand} {inProgress.deviceModel}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {inProgress.repairType.name} · {formatTime(inProgress.startedAt)}
              </p>
            </div>
            <Button disabled={busyId === inProgress.id} onClick={() => handleComplete(inProgress.id)}>
              {t("admin.dashboard.markDone")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-500">{t("admin.dashboard.noTicketInProgress")}</p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
            {t("admin.dashboard.waitingQueue")} ({waiting.length})
          </h2>
          {waiting.length > 0 && (
            <SearchInput
              value={query}
              onChange={setQuery}
              label={t("admin.common.searchQueue")}
              className="sm:w-80"
            />
          )}
        </div>
        {waiting.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-500">{t("admin.dashboard.nothingWaiting")}</p>
        ) : shownWaiting.length === 0 ? (
          <NoMatches />
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
                  <th className="py-2 pr-2">{t("admin.dashboard.colNumber")}</th>
                  <th className="py-2 pr-2">{t("admin.dashboard.colCustomer")}</th>
                  <th className="py-2 pr-2">{t("admin.dashboard.colDeviceRepair")}</th>
                  <th className="py-2 pr-2">{t("admin.dashboard.colEstStart")}</th>
                  <th className="py-2 pr-2">{t("admin.dashboard.colEstCost")}</th>
                  <th className="py-2 pr-2 text-right">{t("admin.dashboard.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {shownWaiting.map((t2) => (
                  <tr key={t2.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{t2.queuePosition}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium text-slate-800 dark:text-white">{t2.customer.name}</div>
                      <div className="text-slate-500 text-xs dark:text-slate-500">{t2.customer.phoneNumber}</div>
                    </td>
                    <td className="py-2 pr-2 dark:text-slate-300">
                      <div>{t2.deviceBrand} {t2.deviceModel}</div>
                      <div className="text-slate-500 text-xs dark:text-slate-500">{t2.repairType.name}</div>
                    </td>
                    <td className="py-2 pr-2 dark:text-slate-300">{formatTime(t2.estimatedStartTime)}</td>
                    <td className="py-2 pr-2 dark:text-slate-300">${t2.estimatedCost.toFixed(2)}</td>
                    <td className="py-2 pr-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          disabled={busyId === t2.id || (t2.queuePosition ?? 0) <= 1}
                          onClick={() => handleMove(t2.id, t2.queuePosition ?? 1, -1)}
                          title={t("admin.dashboard.moveUp")}
                          aria-label={t("admin.dashboard.moveUp")}
                          className="!px-2.5"
                        >
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === t2.id || (t2.queuePosition ?? 0) >= waiting.length}
                          onClick={() => handleMove(t2.id, t2.queuePosition ?? 1, 1)}
                          title={t("admin.dashboard.moveDown")}
                          aria-label={t("admin.dashboard.moveDown")}
                          className="!px-2.5"
                        >
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busyId === t2.id || Boolean(inProgress)}
                          onClick={() => handleStart(t2.id)}
                          title={inProgress ? t("admin.dashboard.finishFirstHint") : undefined}
                        >
                          {t("admin.dashboard.start")}
                        </Button>
                        <Button variant="danger" disabled={busyId === t2.id} onClick={() => handleCancel(t2.id)}>
                          {t("admin.dashboard.cancel")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">
          {t("admin.dashboard.readyForPickup")}
        </h2>
        {done.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-500">{t("admin.dashboard.nothingReady")}</p>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm">
              <tbody>
                {done.map((t2) => (
                  <tr key={t2.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                    <td className="py-2 pr-2">
                      <span className="font-medium text-slate-800 dark:text-white">#{t2.id} {t2.customer.name}</span>{" "}
                      <StatusBadge status={t2.status} />
                    </td>
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                      {t2.deviceBrand} {t2.deviceModel} · {t2.repairType.name}
                    </td>
                    <td className="py-2 pr-2 dark:text-slate-300">${(t2.actualCost ?? t2.estimatedCost).toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right">
                      <Button disabled={busyId === t2.id} onClick={() => handleCollect(t2.id)}>
                        {t("admin.dashboard.markCollected")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
