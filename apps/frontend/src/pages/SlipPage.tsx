import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { ShopConfig, Ticket } from "../lib/types";
import { useLanguage } from "../lib/i18n";
import { Button, ErrorText } from "../components/ui";
import { PrintableReceipt } from "../components/PrintableReceipt";

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

// FR-4.1 - FR-4.3: printable / PDF-savable customer slip. "Save as PDF" is
// available for free via the browser's own print dialog, so there's no
// separate PDF-generation dependency.
export function SlipPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [config, setConfig] = useState<ShopConfig>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.get<Ticket>(`/tickets/${id}`), api.get<ShopConfig>("/config")])
      .then(([ticketData, configData]) => {
        setTicket(ticketData);
        setConfig(configData);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("admin.slip.loadFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <ErrorText>{error}</ErrorText>
        <Link to="/" className="text-sm text-slate-500 underline dark:text-slate-400">
          {t("admin.slip.backToQueue")}
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return <div className="max-w-md mx-auto px-4 py-6 text-slate-500 dark:text-slate-500">{t("admin.slip.loading")}</div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Link to="/register" className="text-sm text-slate-500 underline dark:text-slate-400">
          {t("admin.slip.newRegistration")}
        </Link>
        <Button onClick={() => window.print()}>{t("admin.slip.printSave")}</Button>
      </div>

      <PrintableReceipt
        shopName={config.shop_name ?? t("admin.slip.fallbackShopName")}
        shopAddress={config.shop_address}
        shopContact={config.shop_contact}
        rows={[
          { label: t("admin.slip.ticketNumber"), value: String(ticket.id) },
          { label: t("admin.slip.registered"), value: formatDateTime(ticket.registeredAt) },
          { label: t("admin.slip.customer"), value: ticket.customer.name },
          { label: t("admin.slip.phone"), value: ticket.customer.phoneNumber },
          { label: t("admin.slip.device"), value: `${ticket.deviceBrand} ${ticket.deviceModel}` },
          { label: t("admin.slip.repair"), value: ticket.repairType.name },
          {
            label: t("admin.slip.queuePosition"),
            value: ticket.queuePosition ? `#${ticket.queuePosition}` : t("admin.slip.inProgress"),
          },
          { label: t("admin.slip.estAppointment"), value: formatDateTime(ticket.estimatedStartTime) },
          { label: t("admin.slip.estCost"), value: `$${ticket.estimatedCost.toFixed(2)}` },
        ]}
        qr={{
          // /track/:code (the non-sequential trackingCode), never the
          // numeric ticket id — see the Ticket model's trackingCode comment
          // in schema.prisma for why: the id is sequential and would let
          // anyone enumerate other customers' tickets.
          value: `${window.location.origin}/track/${ticket.trackingCode}`,
          caption: t("admin.slip.scanToTrack"),
          code: ticket.trackingCode,
        }}
        footerNote={t("admin.slip.bringSlip")}
      />
    </div>
  );
}
