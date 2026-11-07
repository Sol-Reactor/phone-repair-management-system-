import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "./env";

// bcryptjs is a pure-JS, drop-in-compatible implementation of bcrypt (same
// hash format, same cost-factor semantics) — no native build step needed.

if (!env.jwtSecret && env.isProduction) {
  throw new Error("JWT_SECRET must be set to a strong random value in production.");
}
const SECRET = env.jwtSecret || "insecure-dev-secret-change-me";
const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const ISSUER = "prqms-backend";
const AUDIENCE = "prqms-staff";
const BCRYPT_COST = 12;

export const SESSION_MAX_AGE_MS = TOKEN_TTL_SECONDS * 1000;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Compared against when the email doesn't exist, so a login for an unknown
// account costs the same bcrypt time as a wrong password — otherwise the
// response time alone reveals which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("prqms-timing-equalizer", BCRYPT_COST);
export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

export type Role = "ADMIN" | "TECHNICIAN";

export type TokenPayload = {
  userId: number;
  email: string;
  role: Role;
  // Bumped on the User row on password change; any token carrying an older
  // version is rejected, so changing a password logs out every other session.
  tokenVersion: number;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "number" &&
    typeof v.email === "string" &&
    typeof v.tokenVersion === "number" &&
    (v.role === "ADMIN" || v.role === "TECHNICIAN")
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Pinning the algorithm blocks alg-confusion attacks ("none", RS/HS swaps).
    const decoded = jwt.verify(token, SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!isTokenPayload(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// Password rules enforced server-side (the UI may also check, but the API is
// the only place that counts). bcrypt silently ignores bytes past 72, so cap
// there rather than let two different long passwords hash identically.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX_BYTES = 72;
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (Buffer.byteLength(pw, "utf8") > PASSWORD_MAX_BYTES) return "Password is too long (max 72 bytes)";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must contain both letters and numbers";
  return null;
}
