import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Printer, X, XCircle } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import {
  DefectiveLogEntry,
  LowStockItem,
  Supplier,
  WholesaleItem,
} from "../../lib/types";
import { Button, Label, TextInput } from "../../components/ui";

// Advanced Stock Management: the INBOUND side (restocking, defective/waste,
// low-stock shopping list) of the same WholesaleItem catalog the Wholesale &
// Debtors module sells OUTBOUND from. English-only copy, matching that
// module's precedent — not yet run through lib/i18n.

type Tab = "restock" | "defective" | "shopping";

const TABS: { key: Tab; label: string }[] = [
  { key: "restock", label: "Restock Inventory" },
  { key: "defective", label: "Defective / Returns" },
  { key: "shopping", label: "Smart Shopping List" },
];

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// --- Alert + auto-dismiss + tab bar: same small pattern as
// AdminWholesalePage.tsx, duplicated here rather than extracted into a
// shared component — this codebase's existing controllers/pages already
// favor small local duplication over cross-file sharing for pieces this
// size (see e.g. each controller's own serialize helpers).
function Alert({
  variant,
  message,
  onDismiss,
}: {
  variant: "error" | "success";
  message: string;
  onDismiss: () => void;
}) {
  const isError = variant === "error";
  const Icon = isError ? XCircle : CheckCircle2;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
        isError
          ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/20"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-500/20"
      }`}
    >
      <Icon
        className={`w-5 h-5 shrink-0 mt-0.5 ${
          isError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
        }`}
      />
      <p
        className={`flex-1 text-sm font-medium ${
          isError ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={`shrink-0 rounded-md p-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${
          isError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function useAutoDismiss(message: string | null, setMessage: (v: string | null) => void, delayMs = 5000) {
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => setMessage(null), delayMs);
    return () => clearTimeout(timer);
  }, [message, setMessage, delayMs]);
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-slate-100 dark:bg-slate-800 gap-1 flex-wrap print:hidden">
      {TABS.map((tb) => {
        const isActive = active === tb.key;
        return (
          <button
            key={tb.key}
            type="button"
            onClick={() => onChange(tb.key)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tb.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminInventoryAdvancedPage() {
  const [tab, setTab] = useState<Tab>("restock");

  const [items, setItems] = useState<WholesaleItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [defective, setDefective] = useState<DefectiveLogEntry[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  useAutoDismiss(loadError, setLoadError);

  const load = () =>
    Promise.all([
      api.get<WholesaleItem[]>("/admin/wholesale/items"),
      api.get<Supplier[]>("/admin/stock/suppliers"),
      api.get<DefectiveLogEntry[]>("/admin/stock/defective"),
      api.get<LowStockItem[]>("/admin/stock/low"),
    ])
      .then(([i, s, d, l]) => {
        setItems(i);
        setSuppliers(s);
        setDefective(d);
        setLowStock(l);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Failed to load inventory data"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="print:hidden">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Advanced Stock Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Restock from suppliers, track defective parts, and see what's running low.
        </p>
      </div>

      {loadError && <Alert variant="error" message={loadError} onDismiss={() => setLoadError(null)} />}

      <TabBar active={tab} onChange={setTab} />

      {tab === "restock" && (
        <RestockTab items={items} suppliers={suppliers} onChanged={load} />
      )}
      {tab === "defective" && <DefectiveTab items={items} entries={defective} onChanged={load} />}
      {tab === "shopping" && <ShoppingListTab lowStock={lowStock} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: Restock Inventory
// ---------------------------------------------------------------------------

function RestockTab({
  items,
  suppliers,
  onChanged,
}: {
  items: WholesaleItem[];
  suppliers: Supplier[];
  onChanged: () => void;
}) {
  const [wholesaleItemId, setWholesaleItemId] = useState("");
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("existing");
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierLocation, setNewSupplierLocation] = useState("");
  const [quantityAdded, setQuantityAdded] = useState("1");
  const [unitCostPrice, setUnitCostPrice] = useState("0");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useAutoDismiss(error, setError);
  useAutoDismiss(success, setSuccess);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(wholesaleItemId)),
    [items, wholesaleItemId]
  );
  const qty = Number(quantityAdded) || 0;
  const cost = Number(unitCostPrice) || 0;
  const totalCost = qty * cost;

  const resetForm = () => {
    setWholesaleItemId("");
    setSupplierMode("existing");
    setSupplierId("");
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierLocation("");
    setQuantityAdded("1");
    setUnitCostPrice("0");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedItem) {
      setError("Select an item to restock");
      return;
    }
    if (qty < 1) {
      setError("Quantity bought must be at least 1");
      return;
    }
    if (supplierMode === "existing" && !supplierId) {
      setError('Select a supplier, or switch to "New"');
      return;
    }
    if (
      supplierMode === "new" &&
      (!newSupplierName.trim() || !newSupplierPhone.trim() || !newSupplierLocation.trim())
    ) {
      setError("New supplier name, phone, and location are all required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/admin/stock/restock", {
        wholesaleItemId: Number(wholesaleItemId),
        quantityAdded: qty,
        unitCostPrice: cost,
        ...(supplierMode === "existing"
          ? { supplierId: Number(supplierId) }
          : {
              newSupplier: {
                name: newSupplierName.trim(),
                phone: newSupplierPhone.trim(),
                location: newSupplierLocation.trim(),
              },
            }),
      });
      setSuccess(`Stock updated — ${qty} × "${selectedItem.name}" added.`);
      resetForm();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record restock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="admin-inventory-advanced-f1">Item</Label>
          <select id="admin-inventory-advanced-f1"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
            value={wholesaleItemId}
            onChange={(e) => setWholesaleItemId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select an item…
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.category}) — {item.stockQuantity} currently in stock
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label id="admin-inventory-advanced-f2-label">Supplier</Label>
          <div role="group" aria-labelledby="admin-inventory-advanced-f2-label" className="flex gap-4 mb-2.5 text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={supplierMode === "existing"}
                onChange={() => setSupplierMode("existing")}
              />
              Existing
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={supplierMode === "new"} onChange={() => setSupplierMode("new")} />
              New supplier
            </label>
          </div>

          {supplierMode === "existing" ? (
            suppliers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-md px-4 py-3">
                No suppliers on file yet — switch to "New supplier" above to add the first one.
              </p>
            ) : (
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a supplier…
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.location}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextInput
                placeholder="Name"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
              />
              <TextInput
                placeholder="Phone"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
              />
              <TextInput
                placeholder="Location (e.g. Merkato, Dubai)"
                value={newSupplierLocation}
                onChange={(e) => setNewSupplierLocation(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="admin-inventory-advanced-f3">Quantity Bought</Label>
            <TextInput id="admin-inventory-advanced-f3"
              type="number"
              min={1}
              value={quantityAdded}
              onChange={(e) => setQuantityAdded(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-inventory-advanced-f4">Unit Cost (what you paid, per unit)</Label>
            <TextInput id="admin-inventory-advanced-f4"
              type="number"
              min={0}
              step="0.01"
              value={unitCostPrice}
              onChange={(e) => setUnitCostPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 p-6">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-slate-600 dark:text-slate-300 font-semibold text-base">Total Cost</span>
            <span className="text-right font-bold text-xl text-slate-800 dark:text-white">{money(totalCost)}</span>
          </div>

          {error && (
            <div className="mt-3">
              <Alert variant="error" message={error} onDismiss={() => setError(null)} />
            </div>
          )}
          {success && (
            <div className="mt-3">
              <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />
            </div>
          )}

          <Button type="submit" disabled={submitting || items.length === 0} className="w-full mt-5 !py-3 !text-base">
            {submitting ? "Recording…" : "Add to Stock"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 2: Defective / Returns
// ---------------------------------------------------------------------------

function DefectiveTab({
  items,
  entries,
  onChanged,
}: {
  items: WholesaleItem[];
  entries: DefectiveLogEntry[];
  onChanged: () => void;
}) {
  const [wholesaleItemId, setWholesaleItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [reportedBy, setReportedBy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useAutoDismiss(error, setError);
  useAutoDismiss(success, setSuccess);

  const [refundingId, setRefundingId] = useState<number | null>(null);

  const selectedItem = items.find((i) => i.id === Number(wholesaleItemId));
  const waiting = entries.filter((e) => e.status === "WAITING_FOR_REFUND");
  const refunded = entries.filter((e) => e.status === "REFUNDED");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedItem) {
      setError("Select an item to report");
      return;
    }
    const qty = Number(quantity) || 0;
    if (qty < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (qty > selectedItem.stockQuantity) {
      setError(`Only ${selectedItem.stockQuantity} in stock — can't report more than that as defective`);
      return;
    }
    if (!reason.trim() || !reportedBy.trim()) {
      setError("Reason and your name are both required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/admin/stock/defective", {
        wholesaleItemId: Number(wholesaleItemId),
        quantity: qty,
        reason: reason.trim(),
        reportedBy: reportedBy.trim(),
      });
      setSuccess(`Reported — ${qty} × "${selectedItem.name}" moved to the defective list.`);
      setWholesaleItemId("");
      setQuantity("1");
      setReason("");
      setReportedBy("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to report defective part");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async (id: number) => {
    setRefundingId(id);
    try {
      await api.patch(`/admin/stock/defective/${id}/refund`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to mark as refunded");
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Report a Defective Part
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-inventory-advanced-f5">Item</Label>
              <select id="admin-inventory-advanced-f5"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                value={wholesaleItemId}
                onChange={(e) => setWholesaleItemId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select an item…
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.stockQuantity === 0}>
                    {item.name} — {item.stockQuantity} in stock
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="admin-inventory-advanced-f6">Quantity</Label>
              <TextInput id="admin-inventory-advanced-f6"
                type="number"
                min={1}
                max={selectedItem?.stockQuantity ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="admin-inventory-advanced-f7">Reason (dead-on-arrival, dropped, cracked in transit…)</Label>
            <TextInput id="admin-inventory-advanced-f7" placeholder="What happened?" value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          <div className="max-w-xs">
            <Label htmlFor="admin-inventory-advanced-f8">Reported By</Label>
            <TextInput id="admin-inventory-advanced-f8" placeholder="Your name" value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} required />
          </div>

          {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
          {success && <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />}

          <Button type="submit" variant="danger" disabled={submitting || items.length === 0}>
            {submitting ? "Reporting…" : "Report Defective"}
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Waiting to Return to Supplier
          {waiting.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs align-middle">
              {waiting.length}
            </span>
          )}
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing waiting on a refund right now.</p>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2 text-right">Qty</th>
                  <th className="py-2 pr-2">Reason</th>
                  <th className="py-2 pr-2">Reported By</th>
                  <th className="py-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-slate-800 dark:text-white font-medium">{entry.wholesaleItem.name}</td>
                    <td className="py-2 pr-2 text-right dark:text-slate-200">{entry.quantity}</td>
                    <td className="py-2 pr-2 text-slate-600 dark:text-slate-300">{entry.reason}</td>
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{entry.reportedBy}</td>
                    <td className="py-2 pr-2 text-right">
                      <Button
                        variant="secondary"
                        disabled={refundingId === entry.id}
                        onClick={() => handleRefund(entry.id)}
                      >
                        {refundingId === entry.id ? "Marking…" : "Mark Refunded"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refunded.length > 0 && (
        <details className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <summary className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer">
            Refunded History ({refunded.length})
          </summary>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm mt-4">
              <tbody>
                {refunded.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-slate-800 dark:text-white">{entry.wholesaleItem.name}</td>
                    <td className="py-2 pr-2 text-right dark:text-slate-200">{entry.quantity}</td>
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3: Smart Shopping List
// ---------------------------------------------------------------------------

function ShoppingListTab({ lowStock }: { lowStock: LowStockItem[] }) {
  const estimatedTotal = lowStock.reduce((sum, item) => sum + item.suggestedReorderQty * item.unitPrice, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center justify-between mb-1 print:hidden">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Parts Running Low
        </h2>
        <Button onClick={() => window.print()} disabled={lowStock.length === 0}>
          <span className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print List
          </span>
        </Button>
      </div>
      <h2 className="hidden print:block text-lg font-semibold text-slate-800 mb-4">Shopping List</h2>

      {lowStock.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
          Nothing is running low — every item is above its minimum stock level.
        </p>
      ) : (
        <>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500 print:text-slate-500">
                  <th className="py-2 pr-2 w-8 print:hidden"></th>
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">In Stock</th>
                  <th className="py-2 pr-2 text-right">Minimum</th>
                  <th className="py-2 pr-2 text-right">Buy At Least</th>
                  <th className="py-2 pr-2 text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                    <td className="py-2 pr-2 print:hidden">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-600" />
                    </td>
                    <td className="py-2 pr-2 text-slate-800 dark:text-white font-medium">{item.name}</td>
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="py-2 pr-2 text-right">
                      <span
                        className={
                          item.stockQuantity === 0
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400 font-medium"
                        }
                      >
                        {item.stockQuantity}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-500 dark:text-slate-400">{item.minStockLevel}</td>
                    <td className="py-2 pr-2 text-right font-semibold text-slate-800 dark:text-white">
                      {item.suggestedReorderQty}
                    </td>
                    <td className="py-2 pr-2 text-right dark:text-slate-200">
                      {money(item.suggestedReorderQty * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400 mr-2">Estimated total to restock:</span>
              <span className="font-bold text-lg text-slate-800 dark:text-white">{money(estimatedTotal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
