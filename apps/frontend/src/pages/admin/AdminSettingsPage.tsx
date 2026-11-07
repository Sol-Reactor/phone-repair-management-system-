import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { ShopConfig } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import { Button, Card, ErrorText, Label, TextInput } from "../../components/ui";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
// English day names are the values actually stored/sent to the API —
// translation only changes the label shown to the user.
const DAY_VALUES: Record<(typeof DAYS)[number], string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export function AdminSettingsPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ShopConfig>({});
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<ShopConfig>("/config")
      .then((data) => {
        setConfig(data);
        try {
          setDaysOff(data.days_off ? JSON.parse(data.days_off) : []);
        } catch {
          setDaysOff([]);
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("admin.settings.loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const field = (key: string) => config[key] ?? "";
  const setField = (key: string, value: string) => setConfig((c) => ({ ...c, [key]: value }));

  const toggleDay = (day: string) => {
    setDaysOff((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.put("/config", { ...config, days_off: JSON.stringify(daysOff) });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-6 text-slate-500 dark:text-slate-500">{t("admin.slip.loading")}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.settings.title")}</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="admin-settings-f1">{t("admin.settings.shopName")}</Label>
            <TextInput id="admin-settings-f1" value={field("shop_name")} onChange={(e) => setField("shop_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="admin-settings-f2">{t("admin.settings.address")}</Label>
            <TextInput id="admin-settings-f2" value={field("shop_address")} onChange={(e) => setField("shop_address", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="admin-settings-f3">{t("admin.settings.contactNumber")}</Label>
            <TextInput id="admin-settings-f3" value={field("shop_contact")} onChange={(e) => setField("shop_contact", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-settings-f4">{t("admin.settings.openingTime")}</Label>
              <TextInput id="admin-settings-f4"
                type="time"
                value={field("working_hours_start")}
                onChange={(e) => setField("working_hours_start", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-settings-f5">{t("admin.settings.closingTime")}</Label>
              <TextInput id="admin-settings-f5"
                type="time"
                value={field("working_hours_end")}
                onChange={(e) => setField("working_hours_end", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-settings-f6">{t("admin.settings.lunchStart")}</Label>
              <TextInput id="admin-settings-f6"
                type="time"
                value={field("lunch_break_start")}
                onChange={(e) => setField("lunch_break_start", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-settings-f7">{t("admin.settings.lunchEnd")}</Label>
              <TextInput id="admin-settings-f7"
                type="time"
                value={field("lunch_break_end")}
                onChange={(e) => setField("lunch_break_end", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label id="admin-settings-f8-label">{t("admin.settings.daysOff")}</Label>
            <div role="group" aria-labelledby="admin-settings-f8-label" className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={daysOff.includes(DAY_VALUES[day])}
                    onChange={() => toggleDay(DAY_VALUES[day])}
                  />
                  {t(`admin.settings.days.${day}`)}
                </label>
              ))}
            </div>
          </div>

          <ErrorText>{error}</ErrorText>
          {saved && <p className="text-sm text-green-600 dark:text-emerald-400">{t("admin.settings.saved")}</p>}

          <Button type="submit" loading={saving}>
            {saving ? t("admin.settings.saving") : t("admin.settings.save")}
          </Button>
        </form>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post("/admin/change-password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.settings.changePasswordFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">
        {t("admin.settings.changePasswordTitle")}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="admin-settings-f9">{t("admin.settings.currentPassword")}</Label>
          <TextInput id="admin-settings-f9"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="admin-settings-f10">{t("admin.settings.newPassword")}</Label>
          <TextInput id="admin-settings-f10"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            aria-describedby="new-password-hint"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p id="new-password-hint" className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            At least 10 characters, with letters and numbers.
          </p>
        </div>
        <ErrorText>{error}</ErrorText>
        {success && <p className="text-sm text-green-600 dark:text-emerald-400">{t("admin.settings.passwordChanged")}</p>}
        <Button type="submit" variant="secondary" loading={submitting}>
          {submitting ? t("admin.settings.saving") : t("admin.settings.changePassword")}
        </Button>
      </form>
    </Card>
  );
}
