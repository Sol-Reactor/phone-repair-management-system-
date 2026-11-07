import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { api } from "../../lib/api";
import { ShopConfig } from "../../lib/types";
import { PublicNavBar } from "./PublicNavBar";
import { PublicFooter } from "./PublicFooter";

const FALLBACK_NAME = "Phone Repair Shop";

export function PublicLayout() {
  const [config, setConfig] = useState<ShopConfig>({});

  useEffect(() => {
    // Public config read — no admin session needed (same endpoint the
    // internal dashboard uses).
    api.get<ShopConfig>("/config").then(setConfig).catch(() => undefined);
  }, []);

  const shopName = config.shop_name || FALLBACK_NAME;

  return (
    <div className="min-h-screen flex flex-col bg-white text-brand-dark dark:bg-brand-dark dark:text-slate-100 transition-colors">
      <PublicNavBar shopName={shopName} />
      <main className="flex-1">
        <Outlet context={{ config, shopName }} />
      </main>
      <PublicFooter shopName={shopName} address={config.shop_address} contact={config.shop_contact} />
    </div>
  );
}
