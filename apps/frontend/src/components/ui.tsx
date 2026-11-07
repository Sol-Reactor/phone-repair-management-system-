import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 dark:bg-brand-dark-surface dark:border-brand-dark-border dark:text-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Primary: golden amber accent (#FEB730) with bold deep dark text (#001619) for 10+:1 contrast
  primary:
    "bg-brand-accent text-brand-dark font-bold hover:bg-brand-accent-hover shadow-sm disabled:bg-amber-200 disabled:text-amber-500 dark:bg-brand-accent dark:text-brand-dark dark:hover:bg-brand-accent-hover dark:disabled:bg-amber-900/40 dark:disabled:text-amber-600",
  // Secondary: soft cyan accent (#C7F8FE) with deep dark text, dark mode gets dark surface cyan border
  secondary:
    "bg-brand-secondary text-brand-dark font-semibold hover:bg-brand-secondary-hover border border-cyan-200 disabled:opacity-50 dark:bg-brand-dark-hover dark:text-brand-secondary dark:border-brand-dark-border dark:hover:bg-brand-dark-surface",
  danger:
    "bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500",
  ghost:
    "text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-brand-dark-hover",
};

// UI/UX rules applied: 44px minimum touch target, cursor-pointer, visible
// focus ring, 200ms color-only transitions (no layout-shifting transforms),
// and a `loading` state that disables the button during async work so a
// double-click can't submit twice.
export function Button({
  variant = "primary",
  className = "",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-dark disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/60 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-border dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-brand-accent/60 dark:focus:border-brand-accent ${props.className ?? ""}`}
    />
  );
}

// Pass htmlFor (matching the input's id) so clicking the label focuses the
// field and screen readers announce the label with the input.
export function Label({ children, className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className={`block text-sm font-semibold text-slate-800 mb-1.5 dark:text-slate-200 ${className}`}>
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  // role="alert" so screen readers announce the error as soon as it appears.
  return (
    <p role="alert" className="text-sm font-medium text-red-700 mt-2 dark:text-red-400">
      {children}
    </p>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const colors: Record<string, string> = {
    WAITING: "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-brand-accent/20 dark:text-brand-accent dark:border-brand-accent/30 font-semibold",
    IN_PROGRESS: "bg-cyan-100 text-cyan-950 border border-cyan-200 dark:bg-brand-secondary/20 dark:text-brand-secondary dark:border-brand-secondary/30 font-semibold",
    DONE: "bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold",
    COLLECTED: "bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-medium",
    CANCELLED: "bg-red-100 text-red-900 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 font-semibold",
  };
  const labelKeys: Record<string, string> = {
    WAITING: "admin.status.waiting",
    IN_PROGRESS: "admin.status.inProgress",
    DONE: "admin.status.done",
    COLLECTED: "admin.status.collected",
    CANCELLED: "admin.status.cancelled",
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs tracking-wide ${colors[status] ?? "bg-slate-100 text-slate-800"}`}>
      {labelKeys[status] ? t(labelKeys[status]) : status.replace("_", " ")}
    </span>
  );
}

// Case-insensitive "does any of these fields contain the query" check used
// by the table filters. Empty query matches everything.
export function matchesQuery(query: string, ...fields: Array<string | number | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q));
}

// Search box for filtering tables: labelled for screen readers, 44px tall,
// with a clear button that appears once something is typed.
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder ?? label}
        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/60 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-border dark:text-white dark:placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("admin.common.clearSearch")}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 cursor-pointer transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-brand-dark-hover dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Shown when a filter hides every row.
export function NoMatches() {
  const { t } = useLanguage();
  return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("admin.common.noMatches")}</p>;
}
