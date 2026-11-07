import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { Ticket, ScreenCondition } from "../lib/types";
import { useLanguage } from "../lib/i18n";
import { Button, ErrorText } from "./ui";

// ---------------------------------------------------------------------------
// Pre-Repair Checklist modal — liability protection (Issue: Technician
// Operations Dashboard). Pops up when a technician starts a new repair.
// Two-step submit: POST the checklist, then PATCH the ticket to
// IN_PROGRESS. The server enforces the ordering too (status route 400s
// without a saved checklist) so this can't be bypassed by calling the API
// directly — this form is the fast path for it, not the only gate.
// ---------------------------------------------------------------------------

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
            value === opt.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
          value === true
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
          value === false
            ? "bg-red-600 text-white border-red-600"
            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
        }`}
      >
        {noLabel}
      </button>
    </div>
  );
}

function ChecklistRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-300">{label}</p>
      {children}
    </div>
  );
}

export function ChecklistForm({
  ticket,
  onClose,
  onStarted,
}: {
  ticket: Ticket;
  onClose: () => void;
  onStarted: (updated: Ticket) => void;
}) {
  const { t } = useLanguage();
  const SCREEN_OPTIONS: { value: ScreenCondition; label: string }[] = [
    { value: "PERFECT", label: t("admin.checklist.screenPerfect") },
    { value: "SCRATCHED", label: t("admin.checklist.screenScratched") },
    { value: "CRACKED", label: t("admin.checklist.screenCracked") },
  ];

  const [screenCondition, setScreenCondition] = useState<ScreenCondition | null>(null);
  const [touchFaceIdWorking, setTouchFaceIdWorking] = useState<boolean | null>(null);
  const [camerasWorking, setCamerasWorking] = useState<boolean | null>(null);
  const [chargingPortWorking, setChargingPortWorking] = useState<boolean | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isComplete =
    screenCondition !== null &&
    touchFaceIdWorking !== null &&
    camerasWorking !== null &&
    chargingPortWorking !== null;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save the checklist.
      await api.post(`/tickets/${ticket.id}/checklist`, {
        screenCondition,
        touchFaceIdWorking,
        camerasWorking,
        chargingPortWorking,
        technicianNotes: technicianNotes.trim() || undefined,
      });
      // 2. Only now move the ticket to IN_PROGRESS — the server will 400
      //    this if step 1 somehow didn't stick, so we never show "started"
      //    without a real checklist on file.
      const updated = await api.patch<Ticket>(`/tickets/${ticket.id}/status`, {
        status: "IN_PROGRESS",
      });
      onStarted(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.checklist.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t("admin.checklist.title")}</h2>
          <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
            #{ticket.id} · {ticket.customer.name} · {ticket.deviceBrand} {ticket.deviceModel}
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">
            {t("admin.checklist.warning")}
          </p>

          <ChecklistRow label={t("admin.checklist.screenCondition")}>
            <SegmentedToggle options={SCREEN_OPTIONS} value={screenCondition} onChange={setScreenCondition} />
          </ChecklistRow>

          <ChecklistRow label={t("admin.checklist.touchFaceId")}>
            <YesNoToggle
              value={touchFaceIdWorking}
              onChange={setTouchFaceIdWorking}
              yesLabel={t("admin.checklist.yes")}
              noLabel={t("admin.checklist.no")}
            />
          </ChecklistRow>

          <ChecklistRow label={t("admin.checklist.cameras")}>
            <YesNoToggle
              value={camerasWorking}
              onChange={setCamerasWorking}
              yesLabel={t("admin.checklist.yes")}
              noLabel={t("admin.checklist.no")}
            />
          </ChecklistRow>

          <ChecklistRow label={t("admin.checklist.chargingPort")}>
            <YesNoToggle
              value={chargingPortWorking}
              onChange={setChargingPortWorking}
              yesLabel={t("admin.checklist.yes")}
              noLabel={t("admin.checklist.no")}
            />
          </ChecklistRow>

          <ChecklistRow label={t("admin.checklist.notesLabel")}>
            <textarea
              rows={3}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder={t("admin.checklist.notesPlaceholder")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
          </ChecklistRow>

          <ErrorText>{error}</ErrorText>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose} loading={submitting}>
            {t("admin.checklist.cancel")}
          </Button>
          <Button
            disabled={!isComplete || submitting}
            onClick={handleSubmit}
            title={!isComplete ? t("admin.checklist.incompleteHint") : undefined}
          >
            {submitting ? t("admin.checklist.saving") : t("admin.checklist.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
