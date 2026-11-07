import { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../lib/env";

// ---------------------------------------------------------------------------
// Security headers. This server only ever returns JSON, so the CSP can be
// maximally strict — nothing here should ever be rendered as a page.
// ---------------------------------------------------------------------------
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
});

// ---------------------------------------------------------------------------
// CORS: explicit allowlist, credentials on (needed for the session cookie).
// Requests with no Origin (curl, the mobile app, server-to-server) are not
// browser cross-site requests and are let through to normal auth checks.
// ---------------------------------------------------------------------------
export const corsPolicy = cors({
  origin(origin, cb) {
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Auth-Transport"],
  maxAge: 600,
});

// ---------------------------------------------------------------------------
// CSRF protection for cookie sessions. A cross-site attacker page can make
// the browser *send* our cookie, but it cannot (a) set a custom header
// without passing our CORS preflight, nor (b) fake the Origin header. Every
// state-changing request must satisfy both. Bearer-token clients (mobile)
// are unaffected because a Bearer header can't be attached cross-site.
// ---------------------------------------------------------------------------
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const usesCookie = Boolean(req.cookies?.[env.cookieName]);
  const origin = req.headers.origin;

  // Any request carrying a browser Origin from outside the allowlist is
  // rejected outright — that covers public endpoints (login, contact) too.
  if (origin && !env.corsOrigins.includes(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  if (usesCookie && req.headers["x-requested-with"] !== "XMLHttpRequest") {
    return res.status(403).json({ error: "Missing CSRF header" });
  }
  next();
}

// Responses carry customer PII and financial data — never let a browser or
// intermediary proxy cache them.
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
}

// ---------------------------------------------------------------------------
// Rate limits (per client IP; set TRUST_PROXY behind a reverse proxy).
// ---------------------------------------------------------------------------
const tooMany = (message: string) => ({ error: message });

// Broad ceiling on everything, to blunt scraping and request floods.
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many requests. Please slow down."),
});

// Login brute-force protection. Keyed by IP + email so one attacker can't
// lock out a real user from a different IP, and only failed attempts count.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
  },
  message: tooMany("Too many failed login attempts. Try again in 15 minutes."),
});

// A coarser per-IP cap on login too, so rotating emails doesn't bypass it.
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many login attempts from this network. Try again later."),
});

// Public tracker — stops enumeration of the 6-char tracking codes.
export const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many lookups. Please try again in a few minutes."),
});

// Public contact form — anti-spam.
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many messages sent. Please try again later."),
});

// Sensitive authenticated action.
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many password change attempts. Try again later."),
});
