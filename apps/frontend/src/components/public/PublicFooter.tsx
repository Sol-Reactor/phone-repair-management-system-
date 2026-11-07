import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n";

export function PublicFooter({
  shopName,
  address,
  contact,
}: {
  shopName: string;
  address?: string;
  contact?: string;
}) {
  const { t } = useLanguage();

  return (
    <footer className="bg-brand-dark text-slate-300">
      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="text-white font-semibold mb-2">{shopName}</p>
          {address && <p className="text-sm text-slate-400">{address}</p>}
          {contact && <p className="text-sm text-slate-400 mt-1">{contact}</p>}
        </div>
        <div>
          <p className="text-white font-semibold mb-2">{t("footer.navigate")}</p>
          <div className="flex flex-col gap-1.5 text-sm">
            <Link to="/" className="hover:text-brand-accent transition-colors">
              {t("nav.home")}
            </Link>
            <Link to="/about" className="hover:text-brand-accent transition-colors">
              {t("nav.about")}
            </Link>
            <Link to="/track" className="hover:text-brand-accent transition-colors">
              {t("nav.track")}
            </Link>
            <Link to="/#contact" className="hover:text-brand-accent transition-colors">
              {t("footer.contact")}
            </Link>
          </div>
        </div>
        <div>
          <p className="text-white font-semibold mb-2">{t("footer.staff")}</p>
          <Link to="/admin/login" className="text-sm hover:text-brand-accent transition-colors">
            {t("footer.staffLogin")}
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-dark-hover py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {shopName}. {t("footer.rights")}
      </div>
    </footer>
  );
}
