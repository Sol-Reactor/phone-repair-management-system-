import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { TrackedTicket } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import { RepairTracker } from "../../components/public/RepairTracker";
import { SearchIcon } from "../../components/public/icons";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrackPage() {
  const { code: codeParam } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [code, setCode] = useState(codeParam?.toUpperCase() ?? "");
  const [ticket, setTicket] = useState<TrackedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = (trackingCode: string) => {
    const clean = trackingCode.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setTicket(null);
    api
      .get<TrackedTicket>(`/track/${encodeURIComponent(clean)}`)
      .then(setTicket)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("track.errorFallback")))
      .finally(() => setLoading(false));
  };

  // Support direct links like /track/AB12CD — auto-search on load.
  useEffect(() => {
    if (codeParam) runSearch(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/track/${code.trim().toUpperCase()}`);
    runSearch(code);
  };

  return (
    <div className="bg-brand-secondary/5 dark:bg-brand-dark min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-dark dark:text-white">
            {t("track.title")}
          </h1>
          <p className="mt-3 text-gray-600 dark:text-slate-400">{t("track.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-10">
          <div className="relative flex-1">
            <SearchIcon className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("track.placeholder")}
              className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-sm font-mono tracking-widest uppercase shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent dark:bg-brand-dark-surface dark:border-brand-dark-hover dark:text-white dark:placeholder:text-slate-500"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-brand-accent px-6 py-3.5 text-sm font-semibold text-brand-dark shadow-sm hover:bg-brand-accent-hover transition-colors disabled:bg-amber-200 disabled:text-amber-400 dark:shadow-glow"
          >
            {loading ? t("track.searching") : t("track.button")}
          </button>
        </form>

        {error && <p className="-mt-6 mb-10 text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        {ticket && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 flex flex-wrap gap-x-8 gap-y-3 text-sm dark:bg-brand-dark-surface dark:border-brand-dark-border">
              <div>
                <p className="text-gray-500 dark:text-slate-400">{t("track.deviceLabel")}</p>
                <p className="font-semibold text-brand-dark dark:text-white">
                  {ticket.deviceBrand} {ticket.deviceModel}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">{t("track.repairLabel")}</p>
                <p className="font-semibold text-brand-dark dark:text-white">{ticket.repairType}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">{t("track.estimatedLabel")}</p>
                <p className="font-semibold text-brand-dark dark:text-white">
                  {formatDateTime(ticket.estimatedStartTime)}
                </p>
              </div>
            </div>

            <RepairTracker status={ticket.status} repairStage={ticket.repairStage} />
          </div>
        )}
      </div>
    </div>
  );
}
