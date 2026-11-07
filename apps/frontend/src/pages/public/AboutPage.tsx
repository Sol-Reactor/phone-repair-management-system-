import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { ShieldCheckIcon, BadgeCheckIcon, TagIcon } from "../../components/public/icons";

// Unsplash placeholder — macro circuit board / motherboard shot, standing
// in for real shop photography until there's an actual "tech repair bench"
// image to swap in.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80";

const VALUE_KEYS = [
  { key: "certified", icon: BadgeCheckIcon },
  { key: "warranty", icon: ShieldCheckIcon },
  { key: "pricing", icon: TagIcon },
] as const;

const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeScaleItem = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function AboutPage() {
  const { shopName } = useOutletContext<{ shopName: string }>();
  const { t } = useLanguage();

  return (
    <div>
      {/* Massive full-width hero image, per the reference design: dark
          gradient overlay for text contrast, fading into the page's own
          background (white in light mode, brand-dark in dark) so it blends
          straight into the section below instead of ending in a hard line. */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/75 via-brand-dark/55 to-white dark:to-brand-dark" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-32 sm:py-44 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg"
          >
            {t("about.heroTitle")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-5 text-lg sm:text-xl text-slate-100 max-w-xl mx-auto"
          >
            {t("about.heroSubtitle")}
          </motion.p>
        </div>
      </section>

      {/* Story / Mission */}
      <section className="bg-white dark:bg-brand-dark">
        <div className="max-w-5xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">
              {t("about.storyTitle")}
            </h2>
            <p className="mt-5 text-gray-600 dark:text-slate-300 leading-relaxed">
              {t("about.storyP1", { shopName })}
            </p>
            <p className="mt-4 text-gray-600 dark:text-slate-300 leading-relaxed">{t("about.storyP2")}</p>
          </motion.div>

          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-5"
          >
            {[
              [t("about.statMinValue"), t("about.statMinLabel")],
              [t("about.statPriceValue"), t("about.statPriceLabel")],
              [t("about.statWarrantyValue"), t("about.statWarrantyLabel")],
              [t("about.statCertifiedValue"), t("about.statCertifiedLabel")],
            ].map(([value, label]) => (
              <motion.div
                key={label}
                variants={fadeScaleItem}
                className="rounded-2xl bg-brand-secondary/15 border border-brand-secondary/30 p-6 dark:bg-brand-dark-surface dark:border-brand-dark-hover"
              >
                <p className="text-3xl font-bold text-brand-accent">{value}</p>
                <p className="text-sm text-gray-600 mt-1 dark:text-slate-400">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-brand-secondary/10 dark:bg-brand-dark-surface/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">
              {t("about.whyTitle")}
            </h2>
            <p className="mt-3 text-gray-600 dark:text-slate-400">{t("about.whySubtitle")}</p>
          </motion.div>

          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid sm:grid-cols-3 gap-6"
          >
            {VALUE_KEYS.map(({ key, icon: Icon }) => (
              <motion.div
                key={key}
                variants={fadeScaleItem}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center dark:bg-brand-dark-surface dark:border-brand-dark-hover"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-dark text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-dark/20 dark:shadow-glow">
                  <Icon />
                </div>
                <h3 className="font-semibold text-brand-dark dark:text-white">{t(`about.values.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                  {t(`about.values.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-gradient-to-br from-brand-dark to-brand-dark-surface">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">{t("about.ctaTitle")}</h2>
          <p className="mt-3 text-brand-secondary/80">{t("about.ctaSubtitle")}</p>
          <a
            href="/#contact"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-brand-accent px-7 py-3.5 text-sm font-semibold text-brand-dark shadow-lg shadow-brand-accent/20 hover:bg-brand-accent-hover transition-colors"
          >
            {t("about.ctaButton")}
          </a>
        </div>
      </section>
    </div>
  );
}
