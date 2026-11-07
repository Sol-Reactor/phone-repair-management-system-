import { RepairStage, TicketStatus } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import {
  PackageIcon,
  SearchIcon,
  ClockAlertIcon,
  WrenchIcon,
  BadgeCheckIcon,
  XCircleIcon,
} from "./icons";

const STAGE_ORDER: { stage: RepairStage; labelKey: string; icon: typeof PackageIcon }[] = [
  { stage: "DROPPED_OFF", labelKey: "droppedOff", icon: PackageIcon },
  { stage: "DIAGNOSING", labelKey: "diagnosing", icon: SearchIcon },
  { stage: "WAITING_ON_PARTS", labelKey: "waitingOnParts", icon: ClockAlertIcon },
  { stage: "REPAIRING", labelKey: "repairing", icon: WrenchIcon },
  { stage: "READY_FOR_PICKUP", labelKey: "readyForPickup", icon: BadgeCheckIcon },
];

type Props = {
  status: TicketStatus;
  repairStage: RepairStage;
};

type StepState = "completed" | "current" | "future";

function circleClasses(state: StepState, isWarning: boolean): string {
  if (state === "completed") return "bg-emerald-500 text-white";
  if (state === "current")
    return isWarning
      ? "bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-500/20"
      : "bg-brand-accent text-brand-dark ring-4 ring-brand-accent-secondary/50 dark:ring-brand-accent/20 font-bold";
  return "bg-slate-100 text-slate-500 dark:bg-brand-dark-hover dark:text-slate-500";
}

function labelClasses(state: StepState, isWarning: boolean): string {
  if (state === "completed") return "text-emerald-700 dark:text-emerald-400";
  if (state === "current") return isWarning ? "text-amber-700 dark:text-amber-400" : "text-brand-dark dark:text-brand-accent font-bold";
  return "text-slate-500 dark:text-slate-500";
}

export function RepairTracker({ status, repairStage }: Props) {
  const { t } = useLanguage();

  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center dark:bg-red-500/10 dark:border-red-500/20">
        <XCircleIcon className="w-10 h-10 text-red-500 mx-auto mb-3 dark:text-red-400" />
        <p className="font-semibold text-red-700 dark:text-red-400">{t("tracker.cancelledTitle")}</p>
        <p className="text-sm text-red-600 mt-1 dark:text-red-400/80">{t("tracker.cancelledBody")}</p>
      </div>
    );
  }

  const isCollected = status === "COLLECTED";
  const currentIndex = STAGE_ORDER.findIndex((s) => s.stage === repairStage);
  const progressPercent = isCollected ? 100 : (currentIndex / (STAGE_ORDER.length - 1)) * 100;

  const stateOf = (i: number): StepState => {
    if (isCollected || i < currentIndex) return "completed";
    if (i === currentIndex) return "current";
    return "future";
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 dark:bg-brand-dark-surface dark:border-brand-dark-hover">
      {isCollected && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {t("tracker.collectedBody")}
          </p>
        </div>
      )}

      {/* Desktop / tablet: horizontal stepper with a progress line behind the circles */}
      <div className="hidden sm:block relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-emerald-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
        <div className="relative flex justify-between">
          {STAGE_ORDER.map((step, i) => {
            const state = stateOf(i);
            const isWarning = state === "current" && step.stage === "WAITING_ON_PARTS";
            const Icon = step.icon;
            return (
              <div key={step.stage} className="flex flex-col items-center flex-1 px-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${circleClasses(state, isWarning)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`mt-3 text-xs font-semibold text-center leading-tight ${labelClasses(state, isWarning)}`}>
                  {t(`tracker.steps.${step.labelKey}`)}
                </p>
                {state === "current" && (
                  <p className={`text-[11px] mt-0.5 ${isWarning ? "text-amber-600 dark:text-amber-400" : "text-brand-dark dark:text-brand-accent font-medium"}`}>
                    {isWarning ? t("tracker.partOnOrder") : t("tracker.inProgress")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical stepper */}
      <div className="sm:hidden">
        {STAGE_ORDER.map((step, i) => {
          const state = stateOf(i);
          const isWarning = state === "current" && step.stage === "WAITING_ON_PARTS";
          const isLast = i === STAGE_ORDER.length - 1;
          const Icon = step.icon;
          return (
            <div key={step.stage} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${circleClasses(state, isWarning)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[1.75rem] ${
                      state === "completed" ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
              <div className={isLast ? "pb-1" : "pb-6"}>
                <p className={`text-sm font-semibold pt-2 ${labelClasses(state, isWarning)}`}>
                  {t(`tracker.steps.${step.labelKey}`)}
                </p>
                {state === "current" && (
                  <p className={`text-xs mt-0.5 ${isWarning ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                    {isWarning ? t("tracker.partOnOrder") : t("tracker.inProgress")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
