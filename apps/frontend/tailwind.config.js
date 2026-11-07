/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Fira Sans'", "ui-sans-serif", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        mono: ["'Fira Code'", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        // PRQMS core brand palette
        brand: {
          // 1. Primary Accent: Golden Amber (#FEB730)
          accent: "#FEB730",
          "accent-hover": "#E5A329",
          "accent-active": "#CC9124",

          // 2. Secondary Accent: Light Cyan (#C7F8FE)
          secondary: "#C7F8FE",
          "secondary-hover": "#A8F0FB",

          // 3. Dark Theme Base: Deep Dark Teal (#001619)
          dark: "#001619",
          "dark-surface": "#0B2529", // Elevated surface for cards/containers in dark mode
          "dark-hover": "#14353B",   // Hover state on dark surfaces
          "dark-border": "#1D474E",  // Clear borders for cards in dark mode
        },
      },
      boxShadow: {
        glow: "0 0 35px -5px rgba(254, 183, 48, 0.3)",
        "glow-cyan": "0 0 35px -5px rgba(199, 248, 254, 0.25)",
      },
    },
  },
  plugins: [],
};
