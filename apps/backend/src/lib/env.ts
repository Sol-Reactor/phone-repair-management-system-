import dotenv from "dotenv";

// Loaded here (not just in index.ts) so any module that imports `env` gets a
// populated process.env regardless of import order.
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5300",
  "http://127.0.0.1:5300",
];

export const env = {
  isProduction,
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  jwtSecret: process.env.JWT_SECRET ?? "",
  // Browsers allowed to call the API with credentials. Requests from any
  // other Origin are rejected by CORS and by the CSRF origin check.
  corsOrigins: list(process.env.CORS_ORIGINS, isProduction ? [] : DEV_ORIGINS),
  // Number of reverse proxies in front of the app (Render/Railway/Nginx = 1).
  // Required for rate limiting to see the real client IP, not the proxy's.
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 0,
  cookieName: "prqms_session",
};

// Fail fast at boot instead of failing later in the middle of a request (or,
// worse, silently running with an insecure default in production).
export function validateEnv(): void {
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is not set.");

  const weakSecrets = new Set(["", "change-me-to-a-long-random-string", "insecure-dev-secret-change-me"]);
  if (weakSecrets.has(env.jwtSecret) || env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be a random string of at least 32 characters.");
  }

  const pinKey = process.env.PIN_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(pinKey)) {
    problems.push("PIN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).");
  }

  if (isProduction && env.corsOrigins.length === 0) {
    problems.push("CORS_ORIGINS must list the frontend origin(s) in production, e.g. https://shop.example.com");
  }

  if (problems.length === 0) return;

  const message = `[env] Insecure or missing configuration:\n  - ${problems.join("\n  - ")}`;
  if (isProduction) {
    throw new Error(message);
  }
  // eslint-disable-next-line no-console
  console.warn(`${message}\n  (allowed in development only — the server will refuse to start in production)`);
}
