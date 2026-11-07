import { Check } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { CustomerSearchResult, RepairType, Ticket } from "../lib/types";
import { useLanguage } from "../lib/i18n";
import { Button, Card, ErrorText, Label, TextInput } from "../components/ui";

const COMMON_BRANDS = ["Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus", "Google", "Other"];

// Issue 1: a bold, hard-to-miss confirmation of the ticket ID + tracking
// code, replacing the form in place rather than immediately navigating away
// — so it can't be missed the way a redirect might be.
function RegistrationSuccess({ ticket, onRegisterAnother }: { ticket: Ticket; onRegisterAnother: () => void }) {
  const { t } = useLanguage();
  return (
    <Card className="text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl dark:bg-emerald-500/10 dark:text-emerald-400">
        <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{t("admin.register.successTitle")}</h1>
      <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{t("admin.register.successSubtitle")}</p>

      <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 py-5 dark:bg-slate-900 dark:border-slate-700">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
          {t("admin.register.ticketIdLabel")}
        </p>
        <p className="text-3xl font-bold text-slate-900 mt-1 dark:text-white">#{ticket.id}</p>
        <p className="text-xs uppercase tracking-wide text-slate-500 mt-3 dark:text-slate-500">
          {t("admin.register.trackingCodeLabel")}
        </p>
        <p className="font-mono text-xl font-semibold text-slate-800 tracking-widest mt-1 dark:text-white">
          {ticket.trackingCode}
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={`/tickets/${ticket.id}/slip`}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-700 w-full sm:w-auto dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          {t("admin.register.viewPrintSlip")}
        </Link>
        <Link
          to={`/track/${ticket.trackingCode}`}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-slate-100 text-slate-800 hover:bg-slate-200 w-full sm:w-auto dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {t("admin.register.trackThisRepair")}
        </Link>
        <Button variant="ghost" onClick={onRegisterAnother}>
          {t("admin.register.registerAnother")}
        </Button>
      </div>
    </Card>
  );
}

export function RegisterPage() {
  const { t } = useLanguage();
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [repairTypeId, setRepairTypeId] = useState("");
  const [devicePin, setDevicePin] = useState("");
  const [notes, setNotes] = useState("");

  const [repairTypes, setRepairTypes] = useState<RepairType[]>([]);
  const [suggestions, setSuggestions] = useState<CustomerSearchResult[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<RepairType[]>("/repair-types").then(setRepairTypes).catch(() => undefined);
  }, []);

  // FR-1.5: search returning customers as the phone number is typed.
  useEffect(() => {
    if (phoneNumber.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<CustomerSearchResult[]>(`/customers/search?q=${encodeURIComponent(phoneNumber.trim())}`)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [phoneNumber]);

  // FR-1.4: preview the estimated cost as soon as repair type + brand are known.
  useEffect(() => {
    if (!repairTypeId) {
      setEstimatedCost(null);
      return;
    }
    const params = new URLSearchParams({ repairTypeId });
    if (deviceBrand.trim()) params.set("deviceBrand", deviceBrand.trim());
    api
      .get<{ basePrice: number }>(`/price-list/lookup?${params.toString()}`)
      .then((r) => setEstimatedCost(r.basePrice))
      .catch(() => setEstimatedCost(null));
  }, [repairTypeId, deviceBrand]);

  const applySuggestion = (c: CustomerSearchResult) => {
    setName(c.name);
    setPhoneNumber(c.phoneNumber);
    if (c.email) setEmail(c.email);
    if (c.lastDeviceBrand) setDeviceBrand(c.lastDeviceBrand);
    setSuggestions([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await api.post<Ticket>("/tickets", {
        name,
        phoneNumber,
        email: email.trim() || undefined,
        deviceBrand,
        deviceModel,
        problemDescription,
        repairTypeId: Number(repairTypeId),
        devicePin: devicePin.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSubmittedTicket(ticket);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.register.registerFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedTicket(null);
    setName("");
    setPhoneNumber("");
    setEmail("");
    setDeviceBrand("");
    setDeviceModel("");
    setProblemDescription("");
    setRepairTypeId("");
    setDevicePin("");
    setNotes("");
    setEstimatedCost(null);
  };

  if (submittedTicket) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <RegistrationSuccess ticket={submittedTicket} onRegisterAnother={resetForm} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-800 mb-4 dark:text-white">{t("admin.register.title")}</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Label htmlFor="register-f1">{t("admin.register.phoneLabel")}</Label>
            <TextInput id="register-f1"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md mt-1 shadow-md max-h-40 overflow-auto dark:bg-slate-800 dark:border-slate-700">
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-200"
                      onClick={() => applySuggestion(c)}
                    >
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-500">{c.phoneNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor="register-f2">{t("admin.register.nameLabel")}</Label>
            <TextInput id="register-f2" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="register-f3">{t("admin.register.emailLabel")}</Label>
            <TextInput id="register-f3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="register-f4">{t("admin.register.deviceBrandLabel")}</Label>
              <TextInput id="register-f4"
                list="brand-options"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                required
              />
              <datalist id="brand-options">
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="register-f5">{t("admin.register.deviceModelLabel")}</Label>
              <TextInput id="register-f5" value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} required />
            </div>
          </div>

          <div>
            <Label htmlFor="register-f6">{t("admin.register.repairTypeLabel")}</Label>
            <select id="register-f6"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              value={repairTypeId}
              onChange={(e) => setRepairTypeId(e.target.value)}
              required
            >
              <option value="" disabled>
                {t("admin.register.selectPlaceholder")}
              </option>
              {repairTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
            {estimatedCost !== null && (
              <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                {t("admin.register.estimatedCost", { amount: estimatedCost.toFixed(2) })}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="register-f7">{t("admin.register.problemLabel")}</Label>
            <textarea id="register-f7"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              rows={3}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="register-f8">{t("admin.register.pinLabel")}</Label>
            <TextInput id="register-f8" value={devicePin} onChange={(e) => setDevicePin(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="register-f9">{t("admin.register.notesLabel")}</Label>
            <textarea id="register-f9"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <ErrorText>{error}</ErrorText>

          <Button type="submit" className="w-full" loading={submitting}>
            {submitting ? t("admin.register.registering") : t("admin.register.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
