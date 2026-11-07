import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { ContactForm } from "../../components/public/ContactForm";
import { TestimonialsSection } from "../../components/public/TestimonialsSection";
import { FaqSection } from "../../components/public/FaqSection";
import {
  ScreenIcon,
  BatteryIcon,
  WaterDropIcon,
  ChipIcon,
  SearchIcon,
  LightningIcon,
  TruckIcon,
} from "../../components/public/icons";

const SERVICE_KEYS = [
  { key: "screen", icon: ScreenIcon },
  { key: "battery", icon: BatteryIcon },
  { key: "water", icon: WaterDropIcon },
  { key: "motherboard", icon: ChipIcon },
] as const;

const STEP_KEYS = [
  { key: "select", icon: SearchIcon },
  { key: "quote", icon: LightningIcon },
  { key: "dropoff", icon: TruckIcon },
] as const;

// Fast & snappy per spec: 0.3-0.5s, nothing that feels sluggish.
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeScaleItem = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function HomePage() {
  const { shopName } = useOutletContext<{ shopName: string }>();
  const { t } = useLanguage();

  // Lets "/#contact" links from other pages (nav, footer, About CTA) land
  // on this section instead of just the top of the page.
  useEffect(() => {
    if (window.location.hash === "#contact") {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-secondary/30 via-white to-white dark:from-brand-dark-surface dark:via-brand-dark dark:to-brand-dark">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={gridStagger}>
            <motion.span
              variants={fadeUp}
              className="inline-block rounded-full bg-brand-accent/10 text-brand-dark text-xs font-semibold px-3 py-1 mb-5 dark:bg-brand-accent/10 dark:text-brand-accent"
            >
              {t("home.badge")}
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-bold tracking-tight text-brand-dark leading-tight dark:text-white"
            >
              {t("home.heroTitle")}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-lg text-gray-600 max-w-md dark:text-slate-300">
              {t("home.heroSubtitle")}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl bg-brand-accent px-6 py-3.5 text-sm font-semibold text-brand-dark shadow-lg shadow-brand-accent/30 hover:bg-brand-accent-hover transition-colors dark:shadow-glow"
              >
                {t("home.ctaBook")}
              </a>
              <Link
                to="/about"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-brand-dark hover:bg-brand-secondary/20 transition-colors dark:border-brand-dark-hover dark:text-slate-200 dark:hover:bg-brand-dark-hover"
              >
                {t("home.ctaLearnMore")}
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <div className="aspect-square max-w-sm mx-auto rounded-[2rem] bg-gradient-to-br from-brand-dark to-brand-dark-surface shadow-2xl shadow-brand-dark/20 flex items-center justify-center dark:shadow-glow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.25} className="w-40 h-40 opacity-90">
                <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                <path d="M10 18.5h4" strokeLinecap="round" />
                <path d="m9 8 1.8 1.8L15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg px-5 py-3 hidden sm:block dark:bg-brand-dark-surface dark:shadow-black/30">
              <p className="text-2xl font-bold text-brand-accent">{t("home.statValue")}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{t("home.statLabel")}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-brand-secondary/10 dark:bg-brand-dark-surface/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">
              {t("home.servicesTitle")}
            </h2>
            <p className="mt-3 text-gray-600 dark:text-slate-400">{t("home.servicesSubtitle")}</p>
          </motion.div>

          {/* Staggered fade/scale — pops in one card at a time as it enters
              the viewport, rather than all at once. */}
          <motion.div
            variants={gridStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {SERVICE_KEYS.map(({ key, icon: Icon }) => (
              <motion.div
                key={key}
                variants={fadeScaleItem}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-brand-accent/30 transition-all dark:bg-brand-dark-surface dark:border-brand-dark-hover dark:hover:border-brand-accent/30"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-secondary/40 text-brand-dark flex items-center justify-center mb-4 dark:bg-brand-secondary/10 dark:text-brand-secondary">
                  <Icon />
                </div>
                <h3 className="font-semibold text-brand-dark dark:text-white">{t(`home.services.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                  {t(`home.services.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-brand-dark">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">{t("home.howTitle")}</h2>
            <p className="mt-3 text-gray-600 dark:text-slate-400">{t("home.howSubtitle")}</p>
          </motion.div>
          <motion.div
            variants={gridStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid sm:grid-cols-3 gap-8"
          >
            {STEP_KEYS.map(({ key, icon: Icon }, i) => (
              <motion.div key={key} variants={fadeScaleItem} className="text-center">
                <div className="relative w-16 h-16 rounded-2xl bg-brand-dark text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-dark/20 dark:shadow-glow">
                  <Icon />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-accent text-brand-dark text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-brand-dark dark:text-white">{t(`home.steps.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-600 max-w-xs mx-auto dark:text-slate-400">
                  {t(`home.steps.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <TestimonialsSection />

      <FaqSection />

      {/* Contact / Feedback */}
      <section id="contact" className="bg-brand-secondary/10 dark:bg-brand-dark-surface/40 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark dark:text-white">
              {t("home.contactTitle")}
            </h2>
            <p className="mt-3 text-gray-600 dark:text-slate-400">{t("home.contactSubtitle", { shopName })}</p>
          </motion.div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
