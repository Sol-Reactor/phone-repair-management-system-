import { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

// Generic printable receipt shell — shared by SlipPage (repair tickets) and
// WholesaleReceiptPage (wholesale distributions), per the "Admin should
// have a Print Receipt button on a Ticket or Wholesale order" requirement.
// Deliberately presentational only (no data fetching, no i18n calls): every
// label is a prop, so each caller supplies its own translated strings
// instead of this component hardcoding English into a shared file.
//
// PDF: no jsPDF/html2pdf dependency here on purpose — same call SlipPage
// made originally (FR-4.1): the browser's own print dialog already offers
// "Save as PDF" for free, and print:hidden / print:border-none classes
// throughout give a clean printed/PDF'd result without an extra ~200KB
// client-side PDF library.
export type ReceiptRow = { label: string; value: ReactNode };

export type PrintableReceiptProps = {
  shopName: string;
  shopAddress?: string | null;
  shopContact?: string | null;
  documentLabel?: string;
  referenceLabel?: string;
  referenceValue?: string;
  rows: ReceiptRow[];
  totals?: ReceiptRow[];
  qr?: { value: string; caption: string; code?: string } | null;
  footerNote?: string;
};

export function PrintableReceipt({
  shopName,
  shopAddress,
  shopContact,
  documentLabel,
  referenceLabel,
  referenceValue,
  rows,
  totals,
  qr,
  footerNote,
}: PrintableReceiptProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 print:border-none print:shadow-none dark:bg-slate-800 dark:border-slate-700">
      <div className="text-center mb-4">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{shopName}</h1>
        {shopAddress && <p className="text-xs text-slate-500 dark:text-slate-400">{shopAddress}</p>}
        {shopContact && <p className="text-xs text-slate-500 dark:text-slate-400">{shopContact}</p>}
        {documentLabel && (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 mt-2">
            {documentLabel}
            {referenceValue ? ` · ${referenceLabel ? `${referenceLabel} ` : ""}${referenceValue}` : ""}
          </p>
        )}
      </div>

      <hr className="my-3 border-dashed dark:border-slate-700" />

      <div className="text-sm space-y-1">
        {rows.map((row, i) => (
          <ReceiptRowLine key={i} row={row} />
        ))}
      </div>

      {totals && totals.length > 0 && (
        <>
          <hr className="my-3 border-dashed dark:border-slate-700" />
          <div className="text-sm space-y-1">
            {totals.map((row, i) => (
              <ReceiptRowLine key={i} row={row} emphasize={i === totals.length - 1} />
            ))}
          </div>
        </>
      )}

      {qr && (
        <>
          <hr className="my-3 border-dashed dark:border-slate-700" />
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="bg-white p-2 rounded">
              <QRCodeSVG value={qr.value} size={112} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{qr.caption}</p>
            {qr.code && (
              <p className="font-mono text-xs font-semibold text-slate-800 tracking-wide dark:text-white">
                {qr.code}
              </p>
            )}
          </div>
        </>
      )}

      {footerNote && (
        <>
          <hr className="my-3 border-dashed dark:border-slate-700" />
          <p className="text-xs text-slate-500 text-center dark:text-slate-400">{footerNote}</p>
        </>
      )}
    </div>
  );
}

function ReceiptRowLine({ row, emphasize }: { row: ReceiptRow; emphasize?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={emphasize ? "text-slate-600 font-semibold dark:text-slate-300" : "text-slate-500 dark:text-slate-500"}>
        {row.label}
      </span>
      <span
        className={
          emphasize
            ? "text-slate-900 font-bold dark:text-white"
            : "text-slate-800 font-medium dark:text-white"
        }
      >
        {row.value}
      </span>
    </div>
  );
}
