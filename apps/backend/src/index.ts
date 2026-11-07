import { env, validateEnv } from "./lib/env";
import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import { prisma } from "./lib/prisma";
import { initTelegramBot } from "./lib/telegramService";
import {
  corsPolicy,
  csrfProtection,
  globalLimiter,
  noStore,
  securityHeaders,
} from "./middleware/security";

validateEnv();
initTelegramBot();

const app = express();

app.disable("x-powered-by");
if (env.trustProxy > 0) app.set("trust proxy", env.trustProxy);

// Order matters: headers + CORS first (so even rejected requests get them),
// then rate limiting before any body parsing or DB work.
app.use(securityHeaders);
app.use(corsPolicy);
app.use("/api", globalLimiter);
// Small body cap: nothing in this API legitimately needs more, and it bounds
// memory use from oversized payloads.
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", noStore);
app.use("/api", csrfProtection);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRoutes);

// Unknown API routes: plain JSON 404, no framework fingerprint.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler. Never echoes internal error details back to the
// client — the full error is logged server-side only.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const e = err as { type?: string; status?: number };
  if (e?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  if (e?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`PRQMS backend listening on http://localhost:${env.port}`);
});

// Release Prisma's DB connections on shutdown so restarts don't leave
// connections dangling in a small serverless pool.
async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received, closing server and DB connections…`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
