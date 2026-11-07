import { Check } from "lucide-react";
import { FormEvent, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useLanguage } from "../../lib/i18n";

// Submits to POST /api/contact (public) — saved to the ContactMessage table
// so the shop can see it on the /admin/messages inbox. This is a general
// inquiry, not a repair booking, so the confirmation shows a plain reference
// number (e.g. "C-1042") rather than a repair ticket ID/tracking code.
export function ContactForm() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ reference: string }>("/contact", {
        name,
        email,
        phone: phone.trim() || undefined,
        message,
      });
      setReference(res.reference);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("contactForm.errorFallback"));
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-10 text-center dark:bg-brand-dark-surface dark:border-brand-dark-hover">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl dark:bg-emerald-500/10 dark:text-emerald-400">
          <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-brand-dark dark:text-white">
          {t("contactForm.thanksTitle", { firstName: name.split(" ")[0] || "there" })}
        </h3>
        <p className="text-gray-600 mt-1 dark:text-slate-400">{t("contactForm.thanksBody")}</p>
        <p className="text-sm text-gray-500 mt-3 dark:text-slate-500">
          {t("contactForm.referenceLabel")}{" "}
          <span className="font-mono font-semibold text-gray-600 dark:text-slate-300">{reference}</span>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8 grid gap-5 dark:bg-brand-dark-surface dark:border-brand-dark-hover"
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-slate-300">
            {t("contactForm.nameLabel")}
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-hover dark:text-white dark:placeholder:text-slate-500"
            placeholder={t("contactForm.namePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-slate-300">
            {t("contactForm.phoneLabel")}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-hover dark:text-white dark:placeholder:text-slate-500"
            placeholder={t("contactForm.phonePlaceholder")}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-slate-300">
          {t("contactForm.emailLabel")}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-hover dark:text-white dark:placeholder:text-slate-500"
          placeholder={t("contactForm.emailPlaceholder")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-slate-300">
          {t("contactForm.messageLabel")}
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent dark:bg-brand-dark dark:border-brand-dark-hover dark:text-white dark:placeholder:text-slate-500"
          placeholder={t("contactForm.messagePlaceholder")}
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-xl bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-dark shadow-sm shadow-brand-accent/30 hover:bg-brand-accent-hover transition-colors disabled:bg-amber-200 disabled:text-amber-400 dark:shadow-glow"
      >
        {submitting ? t("contactForm.sending") : t("contactForm.send")}
      </button>
    </form>
  );
}
