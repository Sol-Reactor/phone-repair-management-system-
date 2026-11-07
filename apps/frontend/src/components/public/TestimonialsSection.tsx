import { useLanguage } from "../../lib/i18n";
import { StarIcon, QuoteIcon } from "./icons";

export function TestimonialsSection() {
  const { t, dict } = useLanguage();
  // A list, not a single string, so it comes from the raw dictionary
  // (dict.testimonials.items) rather than the t() path lookup.
  const testimonials = dict.testimonials.items;

  return (
    <section className="bg-slate-50 dark:bg-brand-dark/40">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("testimonials.title")}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-slate-400">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <figure
              key={item.name}
              className="relative rounded-2xl bg-white border border-slate-100 shadow-sm p-7 flex flex-col dark:bg-brand-dark-surface dark:border-brand-dark-hover"
            >
              <QuoteIcon className="w-8 h-8 text-brand-accent-secondary/60 absolute top-6 right-6 dark:text-brand-accent-secondary/20" />
              <div className="flex gap-0.5 text-brand-accent mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-sm leading-relaxed flex-1 dark:text-slate-300">
                "{item.quote}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-brand-accent text-brand-dark flex items-center justify-center text-sm font-bold shadow-sm">
                  {item.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{item.detail}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
