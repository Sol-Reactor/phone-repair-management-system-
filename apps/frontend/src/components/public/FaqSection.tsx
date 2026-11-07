import { useState } from "react";
import { useLanguage } from "../../lib/i18n";
import { ChevronDownIcon } from "./icons";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t, dict } = useLanguage();
  // FAQ items are a list, not a single string, so they come from the raw
  // per-language dictionary (dict.faq.items) rather than the t() path
  // lookup used everywhere else on this page.
  const FAQS = dict.faq.items;

  return (
    <section className="bg-white dark:bg-brand-dark">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">{t("faq.title")}</h2>
          <p className="mt-3 text-gray-600 dark:text-slate-400">{t("faq.subtitle")}</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.question}
                className="rounded-2xl bg-brand-secondary/10 border border-slate-200/60 shadow-sm overflow-hidden dark:bg-brand-dark-surface dark:border-brand-dark-hover"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-semibold text-brand-dark dark:text-white">{faq.question}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 shrink-0 text-brand-accent transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
