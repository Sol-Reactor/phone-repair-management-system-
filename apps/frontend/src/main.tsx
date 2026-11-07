import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { LanguageProvider } from "./lib/i18n";
import "./index.css";

// This is a Vite SPA, not Next.js — there's no _app.tsx/layout.tsx, so the
// equivalent place to wrap the whole tree in providers is here, around the
// router-owning <App />. next-themes works fine outside Next.js too; it's
// just a Context + localStorage under the hood (attribute="class" toggles
// Tailwind's `dark:` variant on <html>).
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        {/* Honors the OS "reduce motion" setting for every framer-motion animation. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
