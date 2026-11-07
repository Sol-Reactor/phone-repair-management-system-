import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
import { useLanguage } from "../../lib/i18n";
import { SunIcon, MoonIcon, GlobeIcon } from "./icons";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? "text-brand-dark dark:text-brand-accent"
      : "text-gray-600 hover:text-brand-dark dark:text-slate-300 dark:hover:text-brand-accent"
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
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-brand-dark dark:text-brand-accent dark:hover:bg-brand-dark-hover transition-colors"
    >
      {mounted && (isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />)}
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
      title={language === "en" ? "Switch to Amharic" : "ወደ እንግሊዝኛ ቀይር"}
      className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-brand-secondary/30 hover:text-brand-dark dark:text-slate-400 dark:hover:bg-brand-dark-hover dark:hover:text-brand-accent transition-colors"
    >
      <GlobeIcon className="w-4 h-4" />
      {language === "en" ? "EN" : "አማ"}
    </button>
  );
}

export function PublicNavBar({ shopName }: { shopName: string }) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100 dark:bg-brand-dark/80 dark:border-brand-dark-hover">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-brand-dark font-bold text-sm">
            {shopName.slice(0, 1).toUpperCase() || "P"}
          </span>
          <span className="font-semibold text-brand-dark tracking-tight dark:text-white">{shopName}</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-8">
          <NavLink to="/" end className={linkClass}>
            {t("nav.home")}
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            {t("nav.about")}
          </NavLink>
          <NavLink to="/track" className={linkClass}>
            {t("nav.track")}
          </NavLink>
          <Link
            to="/admin/login"
            className="text-sm font-medium text-gray-500 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {t("nav.staffLogin")}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            to="/#contact"
            className="ml-1.5 inline-flex items-center rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm shadow-brand-accent/30 hover:bg-brand-accent-hover transition-colors"
          >
            {t("nav.getQuote")}
          </Link>
        </div>
      </div>
    </header>
  );
}
