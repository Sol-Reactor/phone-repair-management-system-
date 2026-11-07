import { CookieOptions, Request, Response } from "express";
import { env } from "./env";
import { SESSION_MAX_AGE_MS, signToken, TokenPayload } from "./auth";

// The web app's session lives in an httpOnly cookie: JavaScript (including
// any injected XSS payload) can never read the token, unlike localStorage.
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/api",
  };
}

// Non-browser clients (the mobile app) opt into receiving the raw token by
// sending `X-Auth-Transport: bearer`; browsers never get it in the body.
export function wantsBearer(req: Request): boolean {
  return req.headers["x-auth-transport"] === "bearer";
}

// Issues a session for `payload` and returns the raw token only when the
// caller is a bearer client.
export function startSession(req: Request, res: Response, payload: TokenPayload): string | undefined {
  const token = signToken(payload);
  if (wantsBearer(req)) return token;
  res.cookie(env.cookieName, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE_MS });
  return undefined;
}

export function endSession(res: Response): void {
  res.clearCookie(env.cookieName, cookieOptions());
}
