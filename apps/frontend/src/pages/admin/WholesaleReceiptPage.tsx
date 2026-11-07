import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { DistributionLedgerEntry, ShopConfig } from "../../lib/types";
import { Button, ErrorText } from "../../components/ui";
import { PrintableReceipt } from "../../components/PrintableReceipt";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Print/PDF receipt for a single wholesale distribution — the "Wholesale
// order" half of the "Print Receipt" requirement (SlipPage/PrintableReceipt
// covers the Ticket half). No QR code here: unlike a repair ticket, a
// distribution has no public /track page for an external technician to
// scan into, so forcing a QR that points nowhere useful would just be
// clutter. English-only copy, matching the rest of the wholesale module
// (see AdminWholesalePage.tsx) — not yet run through lib/i18n.
export function WholesaleReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<DistributionLedgerEntry | null>(null);
  const [config, setConfig] = useState<ShopConfig>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<DistributionLedgerEntry>(`/admin/wholesale/ledger/${id}`),
      api.get<ShopConfig>("/config"),
    ])
      .then(([entryData, configData]) => {
        setEntry(entryData);
        setConfig(configData);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load distribution"));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <ErrorText>{error}</ErrorText>
        <Link to="/admin/wholesale" className="text-sm text-slate-500 underline dark:text-slate-400">
          Back to Wholesale & Debtors
        </Link>
      </div>
    );
  }

  if (!entry) {
    return <div className="max-w-md mx-auto px-4 py-6 text-slate-500 dark:text-slate-500">Loading…</div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Link to="/admin/wholesale" className="text-sm text-slate-500 underline dark:text-slate-400">
          Back to Wholesale & Debtors
        </Link>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <PrintableReceipt
        shopName={config.shop_name ?? "Repair Shop"}
        shopAddress={config.shop_address}
        shopContact={config.shop_contact}
        documentLabel="Wholesale Distribution Receipt"
        referenceLabel="Distribution #"
        referenceValue={String(entry.id)}
        rows={[
          { label: "Date", value: formatDate(entry.createdAt) },
          { label: "Technician", value: entry.externalTechnician.name },
          { label: "Phone", value: entry.externalTechnician.phone },
          { label: "Shop Location", value: entry.externalTechnician.shopLocation },
          { label: "Part", value: `${entry.wholesaleItem.name} (${entry.wholesaleItem.category})` },
          { label: "Quantity", value: String(entry.quantityTaken) },
          { label: "Unit Price", value: money(entry.wholesaleItem.unitPrice) },
        ]}
        totals={[
          { label: "Total Amount", value: money(entry.totalAmount) },
          { label: "Amount Paid", value: money(entry.amountPaid) },
          { label: "Balance Due", value: money(entry.balanceDue) },
        ]}
        footerNote={
          entry.balanceDue > 0
            ? "Please settle the balance due at your earliest convenience."
            : "Paid in full — thank you for your business."
        }
      />
    </div>
  );
}
