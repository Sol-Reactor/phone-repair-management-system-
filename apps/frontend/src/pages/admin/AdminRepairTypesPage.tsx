import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { RepairType } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import { Button, Card, ErrorText, Label, TextInput } from "../../components/ui";

export function AdminRepairTypesPage() {
  const { t } = useLanguage();
  const [types, setTypes] = useState<RepairType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState("");

  const load = () =>
    api
      .get<RepairType[]>("/repair-types")
      .then(setTypes)
      .catch((e) => setError(e instanceof ApiError ? e.message : t("admin.repairTypes.loadFailed")));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/repair-types", { name, estimatedDurationMinutes: Number(duration) });
      setName("");
      setDuration("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.repairTypes.createFailed"));
    }
  };

  const startEdit = (rt: RepairType) => {
    setEditingId(rt.id);
    setEditName(rt.name);
    setEditDuration(String(rt.estimatedDurationMinutes));
  };

  const handleUpdate = async (id: number) => {
    setError(null);
    try {
      await api.put(`/repair-types/${id}`, { name: editName, estimatedDurationMinutes: Number(editDuration) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.repairTypes.updateFailed"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("admin.repairTypes.confirmDelete"))) return;
    setError(null);
    try {
      await api.delete(`/repair-types/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.repairTypes.deleteFailed"));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.repairTypes.title")}</h1>

      <Card>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">
          {t("admin.repairTypes.addTitle")}
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="admin-repair-types-f1">{t("admin.repairTypes.nameLabel")}</Label>
            <TextInput id="admin-repair-types-f1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="w-32">
            <Label htmlFor="admin-repair-types-f2">{t("admin.repairTypes.durationLabel")}</Label>
            <TextInput id="admin-repair-types-f2" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} required />
          </div>
          <Button type="submit">{t("admin.repairTypes.add")}</Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      <Card>
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
                <th className="py-2 pr-2">{t("admin.repairTypes.colName")}</th>
                <th className="py-2 pr-2">{t("admin.repairTypes.colDuration")}</th>
                <th className="py-2 pr-2 text-right">{t("admin.repairTypes.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((rt) => (
                <tr key={rt.id} className="border-b border-slate-100 transition-colors duration-150 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-brand-dark-hover">
                  {editingId === rt.id ? (
                    <>
                      <td className="py-2 pr-2">
                        <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </td>
                      <td className="py-2 pr-2">
                        <TextInput
                          type="number"
                          min={1}
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right space-x-1">
                        <Button variant="secondary" onClick={() => handleUpdate(rt.id)}>
                          {t("admin.repairTypes.save")}
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          {t("admin.repairTypes.cancel")}
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-2 text-slate-800 dark:text-white">{rt.name}</td>
                      <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                        {rt.estimatedDurationMinutes} {t("admin.repairTypes.minutesSuffix")}
                      </td>
                      <td className="py-2 pr-2 text-right space-x-1">
                        <Button variant="ghost" onClick={() => startEdit(rt)}>
                          {t("admin.repairTypes.edit")}
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(rt.id)}>
                          {t("admin.repairTypes.delete")}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
