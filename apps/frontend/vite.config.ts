import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    // 5173/5174 land inside a Windows Hyper-V TCP port exclusion range
    // (5161-5260) on this machine — EACCES, not EADDRINUSE. 5300 is clear
    // of all the ranges from `netsh interface ipv4 show excludedportrange
    // protocol=tcp` (2518-2617, 4004-4103, 4609-4708, 5061-5260,
    // 5462-5561, 5618-5717, 7829-7928, 50000-50059).
    port: 5300,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
