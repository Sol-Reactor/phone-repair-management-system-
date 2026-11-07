import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, Globe, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";

// Route -> page title, so the header shows exactly one clean title instead
// of the crowded link-everywhere top bar it replaces. Matched by prefix so
// nested routes (e.g. /tickets/:id/slip) still resolve.
const TITLE_ROUTES: { prefix: string; labelKey: string }[] = [
  { prefix: "/app", labelKey: "admin.dashboard.title" },
  { prefix: "/register", labelKey: "admin.register.title" },
  { prefix: "/technician", labelKey: "admin.technician.title" },
  { prefix: "/tickets", labelKey: "admin.slip.pageTitle" },
  { prefix: "/admin/settings", labelKey: "admin.settings.title" },
  { prefix: "/admin/repair-types", labelKey: "admin.repairTypes.title" },
  { prefix: "/admin/price-list", labelKey: "admin.priceList.title" },
  { prefix: "/admin/messages", labelKey: "admin.messages.title" },
  { prefix: "/admin/wholesale", labelKey: "admin.nav.wholesale" },
  { prefix: "/admin/analytics", labelKey: "admin.nav.analytics" },
  { prefix: "/admin/inventory-advanced", labelKey: "admin.nav.inventoryAdvanced" },
  { prefix: "/admin/login", labelKey: "admin.login.title" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-brand-dark dark:text-brand-accent dark:hover:bg-brand-dark-hover transition-colors"
    >
      {mounted && (isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />)}
    </button>
  );
}

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Switch language"
      className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-brand-secondary/30 dark:text-slate-400 dark:hover:bg-brand-dark-hover dark:hover:text-brand-accent transition-colors"
    >
      <Globe className="w-4 h-4" />
      {language === "en" ? "EN" : "አማ"}
    </button>
  );
}

export function AdminHeader() {
  const { t } = useLanguage();
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const match = TITLE_ROUTES.find((r) => location.pathname.startsWith(r.prefix));
  const title = match ? t(match.labelKey) : "";

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 dark:bg-brand-dark dark:border-brand-dark-hover print:hidden flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-brand-dark dark:text-white truncate">{title}</h1>

      <div className="flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        {isAuthenticated && (
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            title={t("admin.nav.logout")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors ml-1"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </header>
  );
}
