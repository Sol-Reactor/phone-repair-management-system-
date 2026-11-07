import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ListChecks,
  UserPlus,
  Wrench,
  Settings,
  Cpu,
  Tag,
  Mail,
  Package,
  BarChart3,
  Warehouse,
  ChevronLeft,
  Globe2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";

type NavItem = {
  to: string;
  end?: boolean;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/app", end: true, labelKey: "admin.nav.queue", icon: ListChecks },
  { to: "/register", labelKey: "admin.nav.newRegistration", icon: UserPlus },
  { to: "/technician", labelKey: "admin.nav.technician", icon: Wrench },
  { to: "/admin/analytics", labelKey: "admin.nav.analytics", icon: BarChart3, adminOnly: true },
  { to: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings, adminOnly: true },
  { to: "/admin/repair-types", labelKey: "admin.nav.repairTypes", icon: Cpu, adminOnly: true },
  { to: "/admin/price-list", labelKey: "admin.nav.priceList", icon: Tag, adminOnly: true },
  { to: "/admin/messages", labelKey: "admin.nav.messages", icon: Mail, adminOnly: true },
  { to: "/admin/wholesale", labelKey: "admin.nav.wholesale", icon: Package, adminOnly: true },
  { to: "/admin/inventory-advanced", labelKey: "admin.nav.inventoryAdvanced", icon: Warehouse, adminOnly: true },
];

const COLLAPSE_KEY = "prqms_sidebar_collapsed";

function linkClass(expanded: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      expanded ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-2.5"
    } ${
      isActive
        ? "bg-brand-accent text-brand-dark dark:bg-brand-accent dark:text-brand-dark shadow-sm"
        : "text-slate-600 hover:bg-brand-secondary/40 dark:text-slate-300 dark:hover:bg-brand-dark-hover"
    }`;
}

export function AdminSidebar() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  // `collapsed` is the pinned preference (persisted). `hovering` is
  // transient: while collapsed, hovering the rail temporarily stretches it
  // back out so labels are readable, then it shrinks again on mouse leave.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [hovering, setHovering] = useState(false);
  const expanded = !collapsed || hovering;

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`group/sidebar shrink-0 min-h-screen bg-white border-r border-slate-200 dark:bg-brand-dark dark:border-brand-dark-hover print:hidden flex flex-col transition-[width] duration-300 ${
        expanded ? "w-64" : "w-[68px]"
      }`}
    >
      <div className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-brand-dark-hover">
        {expanded && (
          <>
            <span className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-brand-dark font-bold text-sm shrink-0">
              Q
            </span>
            <span className="ml-2.5 font-semibold text-brand-dark tracking-tight dark:text-white truncate">
              PRQMS
            </span>
          </>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-slate-400 hover:bg-brand-secondary/30 hover:text-brand-dark dark:text-slate-500 dark:hover:bg-brand-dark-hover dark:hover:text-slate-300 transition-opacity duration-200 opacity-0 group-hover/sidebar:opacity-100 focus:opacity-100 focus-visible:opacity-100 ${
            expanded ? "ml-auto" : "mx-auto"
          }`}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ to, end, labelKey, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className={linkClass(expanded)} title={!expanded ? t(labelKey) : undefined}>
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {expanded && <span className="truncate">{t(labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 dark:border-brand-dark-hover">
        <NavLink
          to="/"
          title={!expanded ? t("admin.nav.viewPublicSite") : undefined}
          className={`flex items-center rounded-lg text-sm text-slate-400 hover:bg-brand-secondary/30 hover:text-brand-dark dark:text-slate-500 dark:hover:bg-brand-dark-hover dark:hover:text-slate-300 transition-colors ${
            expanded ? "gap-3 px-3 py-2" : "justify-center px-0 py-2"
          }`}
        >
          <Globe2 className="w-[18px] h-[18px] shrink-0" />
          {expanded && <span className="truncate">{t("admin.nav.viewPublicSite")}</span>}
        </NavLink>
      </div>
    </aside>
  );
}
