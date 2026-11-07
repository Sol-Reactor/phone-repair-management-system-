import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, PackageSearch, X, XCircle } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { DistributionLedgerEntry, ExternalTechnician, PaymentStatus, WholesaleItem } from "../../lib/types";
import { Button, Label, matchesQuery, NoMatches, SearchInput, TextInput } from "../../components/ui";

// B2B Wholesale Parts Distribution module. Deliberately plain-English copy
// (not run through lib/i18n's t()) for now — localizing this whole module
// is a follow-up, not a blocker for shipping the feature to the shop.

type Tab = "distribute" | "items" | "ledger" | "debtors";

const TABS: { key: Tab; label: string }[] = [
  { key: "distribute", label: "Distribute Part" },
  { key: "items", label: "Items & Stock" },
  { key: "ledger", label: "Ledger History" },
  { key: "debtors", label: "Debtors List" },
];

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, string> = {
    PAID: "bg-green-100 text-green-800 dark:bg-emerald-500/10 dark:text-emerald-400",
    PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
    LOAN: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>
  );
}

// Dismissible notification banner — replaces the old bare-text error/success
// lines, which just sat on screen forever until the next action happened to
// clear them. This one is clearly a self-contained "message" (icon, tinted
// card, close button) and clears itself after a few seconds so a
// blocked-delete or success toast doesn't linger indefinitely.
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

// Auto-clears a message state a few seconds after it's set, so a
// notification "goes away once it's told you" instead of sticking around
// until the next unrelated action happens to overwrite it. Manual dismiss
// (the Alert's close button) still works immediately via the same setter.
function useAutoDismiss(message: string | null, setMessage: (v: string | null) => void, delayMs = 5000) {
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(() => setMessage(null), delayMs);
    return () => clearTimeout(timer);
  }, [message, setMessage, delayMs]);
}

// Pill-shaped segmented control — same visual language as the Yes/No and
// screen-condition toggles in ChecklistForm, so the "tabs" read as one
// consistent control instead of a generic underline-tab widget.
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-slate-100 dark:bg-slate-800 gap-1 flex-wrap">
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

export function AdminWholesalePage() {
  const [tab, setTab] = useState<Tab>("distribute");

  const [items, setItems] = useState<WholesaleItem[]>([]);
  const [technicians, setTechnicians] = useState<ExternalTechnician[]>([]);
  const [ledger, setLedger] = useState<DistributionLedgerEntry[]>([]);
  const [debtors, setDebtors] = useState<ExternalTechnician[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () =>
    Promise.all([
      api.get<WholesaleItem[]>("/admin/wholesale/items"),
      api.get<ExternalTechnician[]>("/admin/wholesale/technicians"),
      api.get<DistributionLedgerEntry[]>("/admin/wholesale/ledger"),
      api.get<ExternalTechnician[]>("/admin/wholesale/debtors"),
    ])
      .then(([i, t, l, d]) => {
        setItems(i);
        setTechnicians(t);
        setLedger(l);
        setDebtors(d);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Failed to load wholesale data"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoDismiss(loadError, setLoadError);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Wholesale & Debtors</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Distribute parts to external technicians and track who still owes you.
        </p>
      </div>

      {loadError && <Alert variant="error" message={loadError} onDismiss={() => setLoadError(null)} />}

      <div className="flex items-center gap-3">
        <TabBar active={tab} onChange={setTab} />
        {tab === "debtors" && debtors.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-semibold">
            {debtors.length}
          </span>
        )}
      </div>

      {tab === "distribute" && (
        <DistributeTab
          items={items}
          technicians={technicians}
          onDistributed={load}
          onGoToItems={() => setTab("items")}
        />
      )}
      {tab === "items" && <ItemsTab items={items} onItemsChanged={load} />}
      {tab === "ledger" && <LedgerTab entries={ledger} />}
      {tab === "debtors" && <DebtorsTab debtors={debtors} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: Distribute Part — POS-style form
// ---------------------------------------------------------------------------

function DistributeTab({
  items,
  technicians,
  onDistributed,
  onGoToItems,
}: {
  items: WholesaleItem[];
  technicians: ExternalTechnician[];
  onDistributed: () => void;
  onGoToItems: () => void;
}) {
  const [wholesaleItemId, setWholesaleItemId] = useState("");
  const [technicianMode, setTechnicianMode] = useState<"existing" | "new">("existing");
  const [externalTechnicianId, setExternalTechnicianId] = useState("");
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");
  const [newTechShopLocation, setNewTechShopLocation] = useState("");
  const [quantityTaken, setQuantityTaken] = useState("1");
  const [amountPaid, setAmountPaid] = useState("0");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useAutoDismiss(error, setError);
  useAutoDismiss(success, setSuccess);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(wholesaleItemId)),
    [items, wholesaleItemId]
  );

  const qty = Number(quantityTaken) || 0;
  const paid = Number(amountPaid) || 0;
  const totalAmount = selectedItem ? selectedItem.unitPrice * qty : 0;
  const remainingDebt = Math.max(totalAmount - paid, 0);
  const overpaid = paid > totalAmount && totalAmount > 0;

  const resetForm = () => {
    setWholesaleItemId("");
    setTechnicianMode("existing");
    setExternalTechnicianId("");
    setNewTechName("");
    setNewTechPhone("");
    setNewTechShopLocation("");
    setQuantityTaken("1");
    setAmountPaid("0");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedItem) {
      setError("Select an item to distribute");
      return;
    }
    if (qty < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    if (qty > selectedItem.stockQuantity) {
      setError(`Only ${selectedItem.stockQuantity} in stock`);
      return;
    }
    if (overpaid) {
      setError("Amount paid cannot exceed the total amount");
      return;
    }
    if (technicianMode === "existing" && !externalTechnicianId) {
      setError("Select an external technician, or switch to \"New\"");
      return;
    }
    if (technicianMode === "new" && (!newTechName.trim() || !newTechPhone.trim() || !newTechShopLocation.trim())) {
      setError("New technician name, phone, and shop location are all required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/admin/wholesale/distribute", {
        wholesaleItemId: Number(wholesaleItemId),
        quantityTaken: qty,
        amountPaid: paid,
        ...(technicianMode === "existing"
          ? { externalTechnicianId: Number(externalTechnicianId) }
          : {
              newTechnician: {
                name: newTechName.trim(),
                phone: newTechPhone.trim(),
                shopLocation: newTechShopLocation.trim(),
              },
            }),
      });
      setSuccess("Distribution recorded.");
      resetForm();
      onDistributed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record distribution");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="admin-wholesale-item">Item</Label>
          {items.length === 0 ? (
            // The actual fix for "the select is empty": there's simply
            // nothing in the parts catalog yet (a data problem, not a
            // rendering bug) — point the admin straight at where to add one
            // instead of leaving a mysteriously empty dropdown.
            <div className="flex items-start gap-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-4 py-3">
              <PackageSearch className="w-5 h-5 text-slate-500 dark:text-slate-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No parts in your catalog yet — add one first.
                </p>
                <button
                  type="button"
                  onClick={onGoToItems}
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 mt-1"
                >
                  Add an item →
                </button>
              </div>
            </div>
          ) : (
            <select id="admin-wholesale-item"
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
                  {item.name} ({item.category}) — {item.stockQuantity} in stock @ {money(item.unitPrice)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label id="admin-wholesale-f1-label">External Technician</Label>
          <div role="group" aria-labelledby="admin-wholesale-f1-label" className="flex gap-4 mb-2.5 text-sm text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={technicianMode === "existing"}
                onChange={() => setTechnicianMode("existing")}
              />
              Existing
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={technicianMode === "new"} onChange={() => setTechnicianMode("new")} />
              New technician
            </label>
          </div>

          {technicianMode === "existing" ? (
            technicians.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-md px-4 py-3">
                No technicians on file yet — switch to "New technician" above to add the first one.
              </p>
            ) : (
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                value={externalTechnicianId}
                onChange={(e) => setExternalTechnicianId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a technician…
                </option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.shopLocation}
                    {t.totalDebt > 0 ? ` (owes ${money(t.totalDebt)})` : ""}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextInput placeholder="Name" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} />
              <TextInput
                placeholder="Phone"
                value={newTechPhone}
                onChange={(e) => setNewTechPhone(e.target.value)}
              />
              <TextInput
                placeholder="Shop location"
                value={newTechShopLocation}
                onChange={(e) => setNewTechShopLocation(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="admin-wholesale-f2">Quantity</Label>
            <TextInput id="admin-wholesale-f2"
              type="number"
              min={1}
              max={selectedItem?.stockQuantity ?? undefined}
              value={quantityTaken}
              onChange={(e) => setQuantityTaken(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-wholesale-f3">Amount Paid</Label>
            <TextInput id="admin-wholesale-f3"
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Premium summary — the box this whole redesign was about. Distinct
            blue tint (not just gray) so it reads as "here's the money", bold
            final numbers, and the submit button lives right inside it. */}
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 p-6">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total amount</span>
            <span className="text-right font-semibold text-slate-800 dark:text-white">{money(totalAmount)}</span>
            <span className="text-slate-500 dark:text-slate-400">Amount paid</span>
            <span className="text-right font-semibold text-slate-800 dark:text-white">{money(paid)}</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold text-base pt-2 border-t border-blue-200/70 dark:border-blue-500/20 mt-1">
              Remaining debt
            </span>
            <span
              className={`text-right font-bold text-xl pt-1.5 border-t border-blue-200/70 dark:border-blue-500/20 mt-1 ${
                remainingDebt > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {money(remainingDebt)}
            </span>
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
            {submitting ? "Recording…" : "Record Distribution"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 2: Items & Stock — the catalog of parts available to distribute.
// This is the piece that was missing entirely: the Distribute tab's Item
// select reads from GET /admin/wholesale/items, and the backend has always
// supported POST-ing a new one (wholesaleController.createItem), but nothing
// in the UI ever called it — so the dropdown had nothing to show. This tab
// is that missing "add an item" surface, plus a stock-level overview.
// ---------------------------------------------------------------------------

function ItemsTab({ items, onItemsChanged }: { items: WholesaleItem[]; onItemsChanged: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useAutoDismiss(error, setError);
  useAutoDismiss(success, setSuccess);
  useAutoDismiss(deleteError, setDeleteError);

  const handleDelete = async (item: WholesaleItem) => {
    if (!window.confirm(`Delete "${item.name}" from the catalog? This can't be undone.`)) return;
    setDeleteError(null);
    setDeletingId(item.id);
    try {
      await api.delete(`/admin/wholesale/items/${item.id}`);
      onItemsChanged();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !category.trim()) {
      setError("Name and category are required");
      return;
    }

    setSubmitting(true);
    try {
      // The backend matches on name (case-insensitive) and, if a part with
      // this name already exists, restocks it instead of creating a
      // duplicate catalog row — see wholesaleController.createItem.
      const result = await api.post<{ name: string; merged: boolean }>("/admin/wholesale/items", {
        name: name.trim(),
        category: category.trim(),
        stockQuantity: Number(stockQuantity) || 0,
        unitPrice: Number(unitPrice) || 0,
      });
      setSuccess(
        result.merged
          ? `"${result.name}" already existed — added to its stock instead of creating a duplicate.`
          : `"${result.name}" added to the catalog.`
      );
      setName("");
      setCategory("");
      setStockQuantity("1");
      setUnitPrice("0");
      onItemsChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
          Add a Part
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="admin-wholesale-f4">Name</Label>
            <TextInput id="admin-wholesale-f4" placeholder="e.g. iPhone 13 Screen" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="admin-wholesale-f5">Category</Label>
            <TextInput id="admin-wholesale-f5" placeholder="e.g. Screens" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="admin-wholesale-f6">Stock Quantity</Label>
            <TextInput id="admin-wholesale-f6"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-wholesale-f7">Unit Price</Label>
            <TextInput id="admin-wholesale-f7"
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2 md:col-span-4 space-y-2">
            {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}
            {success && <Alert variant="success" message={success} onDismiss={() => setSuccess(null)} />}
            <Button type="submit" loading={submitting}>
              {submitting ? "Adding…" : "Add Item"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
        {deleteError && (
          <div className="mb-4">
            <Alert variant="error" message={deleteError} onDismiss={() => setDeleteError(null)} />
          </div>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing in the catalog yet — add your first part above.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2 text-right">Stock</th>
                  <th className="py-2 pr-2 text-right">Unit Price</th>
                  <th className="py-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const canDelete = item.stockQuantity === 0;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                      <td className="py-2 pr-2 text-slate-800 dark:text-white font-medium">{item.name}</td>
                      <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{item.category}</td>
                      <td className="py-2 pr-2 text-right">
                        <span
                          className={`font-medium ${
                            item.stockQuantity === 0
                              ? "text-red-600 dark:text-red-400"
                              : item.stockQuantity < 5
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right dark:text-slate-200">{money(item.unitPrice)}</td>
                      <td className="py-2 pr-2 text-right">
                        <Button
                          variant="danger"
                          disabled={!canDelete || deletingId === item.id}
                          onClick={() => handleDelete(item)}
                          title={canDelete ? "Delete this item" : "Only zero-stock items can be deleted"}
                        >
                          {deletingId === item.id ? "Deleting…" : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3: Ledger History
// ---------------------------------------------------------------------------

function LedgerTab({ entries }: { entries: DistributionLedgerEntry[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const shown = entries.filter(
    (e) =>
      (status === "ALL" || e.paymentStatus === status) &&
      matchesQuery(query, e.wholesaleItem?.name, e.externalTechnician?.name)
  );

  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">No distributions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} label="Search item or technician" className="sm:w-80" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PaymentStatus | "ALL")}
          aria-label="Filter by payment status"
          className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-accent/60 dark:bg-brand-dark dark:border-brand-dark-border dark:text-white"
        >
          <option value="ALL">All payment statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="LOAN">Loan</option>
        </select>
      </div>
      {shown.length === 0 && <NoMatches />}
      <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2">Technician</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Total</th>
              <th className="py-2 pr-2 text-right">Paid</th>
              <th className="py-2 pr-2 text-right">Balance</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                <td className="py-2 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-2 text-slate-800 dark:text-white">{entry.wholesaleItem?.name}</td>
                <td className="py-2 pr-2 text-slate-800 dark:text-white">{entry.externalTechnician?.name}</td>
                <td className="py-2 pr-2 text-right dark:text-slate-200">{entry.quantityTaken}</td>
                <td className="py-2 pr-2 text-right dark:text-slate-200">{money(entry.totalAmount)}</td>
                <td className="py-2 pr-2 text-right dark:text-slate-200">{money(entry.amountPaid)}</td>
                <td className="py-2 pr-2 text-right font-medium dark:text-slate-100">{money(entry.balanceDue)}</td>
                <td className="py-2 pr-2">
                  <PaymentStatusBadge status={entry.paymentStatus} />
                </td>
                <td className="py-2 pr-2 text-right">
                  <Link
                    to={`/admin/wholesale/receipt/${entry.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Print
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 4: Debtors List — only technicians with an outstanding balance
// ---------------------------------------------------------------------------

function DebtorsTab({ debtors }: { debtors: ExternalTechnician[] }) {
  if (debtors.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No outstanding debt — every external technician is paid up.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Phone</th>
            <th className="py-2 pr-2">Shop Location</th>
            <th className="py-2 pr-2 text-right">Owes</th>
          </tr>
        </thead>
        <tbody>
          {debtors.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
              <td className="py-2 pr-2 text-slate-800 dark:text-white font-medium">{d.name}</td>
              <td className="py-2 pr-2">
                <a href={`tel:${d.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {d.phone}
                </a>
              </td>
              <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{d.shopLocation}</td>
              <td className="py-2 pr-2 text-right font-semibold text-red-600 dark:text-red-400">
                {money(d.totalDebt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
