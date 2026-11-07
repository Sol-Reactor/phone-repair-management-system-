import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { PriceListEntry, RepairType } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import { Button, Card, ErrorText, Label, matchesQuery, NoMatches, SearchInput, TextInput } from "../../components/ui";

export function AdminPriceListPage() {
  const { t } = useLanguage();
  const [types, setTypes] = useState<RepairType[]>([]);
  const [entries, setEntries] = useState<PriceListEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [repairTypeId, setRepairTypeId] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [basePrice, setBasePrice] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [query, setQuery] = useState("");

  const load = () =>
    Promise.all([api.get<RepairType[]>("/repair-types"), api.get<PriceListEntry[]>("/price-list")])
      .then(([t2, p]) => {
        setTypes(t2);
        setEntries(p);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("admin.priceList.loadFailed")));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/price-list", {
        repairTypeId: Number(repairTypeId),
        deviceBrand: deviceBrand.trim() === "" ? null : deviceBrand.trim(),
        basePrice: Number(basePrice),
      });
      setDeviceBrand("");
      setBasePrice("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.priceList.createFailed"));
    }
  };

  const handleUpdate = async (id: number) => {
    setError(null);
    try {
      await api.put(`/price-list/${id}`, { basePrice: Number(editPrice) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.priceList.updateFailed"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("admin.priceList.confirmDelete"))) return;
    setError(null);
    try {
      await api.delete(`/price-list/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.priceList.deleteFailed"));
    }
  };

  const shownEntries = entries.filter((p) =>
    matchesQuery(query, p.repairType?.name, p.deviceBrand ?? t("admin.priceList.defaultLabel"))
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.priceList.title")}</h1>

      <Card>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">
          {t("admin.priceList.addTitle")}
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3 items-end flex-wrap">
          <div className="w-56">
            <Label htmlFor="admin-price-list-f1">{t("admin.priceList.repairTypeLabel")}</Label>
            <select id="admin-price-list-f1"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              value={repairTypeId}
              onChange={(e) => setRepairTypeId(e.target.value)}
              required
            >
              <option value="" disabled>
                {t("admin.priceList.selectPlaceholder")}
              </option>
              {types.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <Label htmlFor="admin-price-list-f2">{t("admin.priceList.deviceBrandLabel")}</Label>
            <TextInput id="admin-price-list-f2"
              placeholder={t("admin.priceList.brandPlaceholder")}
              value={deviceBrand}
              onChange={(e) => setDeviceBrand(e.target.value)}
            />
          </div>
          <div className="w-28">
            <Label htmlFor="admin-price-list-f3">{t("admin.priceList.priceLabel")}</Label>
            <TextInput id="admin-price-list-f3" type="number" min={0} step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
          </div>
          <Button type="submit">{t("admin.priceList.add")}</Button>
        </form>
        <p className="text-xs text-slate-500 mt-2 dark:text-slate-500">{t("admin.priceList.hint")}</p>
        <ErrorText>{error}</ErrorText>
      </Card>

      <Card>
        <SearchInput value={query} onChange={setQuery} label={t("admin.common.searchPrices")} className="mb-4 sm:w-80" />
        {shownEntries.length === 0 && entries.length > 0 && <NoMatches />}
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
                <th className="py-2 pr-2">{t("admin.priceList.colRepairType")}</th>
                <th className="py-2 pr-2">{t("admin.priceList.colBrand")}</th>
                <th className="py-2 pr-2">{t("admin.priceList.colPrice")}</th>
                <th className="py-2 pr-2 text-right">{t("admin.priceList.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {shownEntries.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                  <td className="py-2 pr-2 text-slate-800 dark:text-white">{p.repairType?.name ?? p.repairTypeId}</td>
                  <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                    {p.deviceBrand ?? <em>{t("admin.priceList.defaultLabel")}</em>}
                  </td>
                  <td className="py-2 pr-2 dark:text-slate-200">
                    {editingId === p.id ? (
                      <TextInput
                        type="number"
                        min={0}
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      `$${p.basePrice.toFixed(2)}`
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right space-x-1">
                    {editingId === p.id ? (
                      <>
                        <Button variant="secondary" onClick={() => handleUpdate(p.id)}>
                          {t("admin.priceList.save")}
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          {t("admin.priceList.cancel")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPrice(String(p.basePrice));
                          }}
                        >
                          {t("admin.priceList.edit")}
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(p.id)}>
                          {t("admin.priceList.delete")}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
