// DEAD CODE — superseded by AdminSidebar.tsx + AdminHeader.tsx (see
// InternalLayout.tsx, which renders those instead of this file). Nothing
// imports NavBar anymore; kept only because this tool has no delete
// capability. Safe to delete this file. Do not add new nav links here —
// add them to AdminSidebar's NAV_ITEMS (+ AdminHeader's TITLE_ROUTES for
// the page title) instead, or they silently won't appear anywhere.
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";
import { SunIcon, MoonIcon, GlobeIcon } from "./public/icons";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive
      ? "bg-slate-900 text-white dark:bg-slate-700"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

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
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
    >
      {mounted && (isDark ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />)}
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
      className="flex items-center gap-1 h-8 px-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
    >
      <GlobeIcon className="w-3.5 h-3.5" />
      {language === "en" ? "EN" : "አማ"}
    </button>
  );
}

export function NavBar() {
  const { isAdmin, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <nav className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 print:hidden">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-800 mr-4 dark:text-white">PRQMS</span>
          <NavLink to="/app" end className={linkClass}>
            {t("admin.nav.queue")}
          </NavLink>
          <NavLink to="/register" className={linkClass}>
            {t("admin.nav.newRegistration")}
          </NavLink>
          <NavLink to="/technician" className={linkClass}>
            {t("admin.nav.technician")}
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/analytics" className={linkClass}>
                {t("admin.nav.analytics")}
              </NavLink>
              <NavLink to="/admin/settings" className={linkClass}>
                {t("admin.nav.settings")}
              </NavLink>
              <NavLink to="/admin/repair-types" className={linkClass}>
                {t("admin.nav.repairTypes")}
              </NavLink>
              <NavLink to="/admin/price-list" className={linkClass}>
                {t("admin.nav.priceList")}
              </NavLink>
              <NavLink to="/admin/messages" className={linkClass}>
                {t("admin.nav.messages")}
              </NavLink>
              <NavLink to="/admin/wholesale" className={linkClass}>
                {t("admin.nav.wholesale")}
              </NavLink>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <NavLink
            to="/"
            className="text-sm text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {t("admin.nav.viewPublicSite")}
          </NavLink>
          {isAdmin ? (
            <button
              onClick={logout}
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {t("admin.nav.logout")}
            </button>
          ) : (
            <NavLink
              to="/admin/login"
              className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {t("admin.nav.adminLogin")}
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
