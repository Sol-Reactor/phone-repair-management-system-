import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
      // How the caller authenticated — the CSRF check only applies to
      // cookie sessions (a Bearer header can't be forged cross-site).
      authVia?: "cookie" | "bearer";
    }
  }
}

function extractToken(req: Request): { token: string; via: "cookie" | "bearer" } | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return { token: header.slice(7), via: "bearer" };
  const cookie = req.cookies?.[env.cookieName];
  if (typeof cookie === "string" && cookie) return { token: cookie, via: "cookie" };
  return null;
}

// Verifies the JWT signature AND re-checks the user row, so that:
//  - a deleted user is locked out immediately,
//  - a changed password (tokenVersion bump) revokes every older token,
//  - a demoted ADMIN loses admin access immediately — the role used for
//    authorization comes from the database, never from the token claim.
async function authenticate(req: Request): Promise<TokenPayload | null> {
  const extracted = extractToken(req);
  if (!extracted) return null;

  const payload = verifyToken(extracted.token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;

  req.authVia = extracted.via;
  return { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
}

function guard(requireAdminRole: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    authenticate(req)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ error: "Not authenticated" });
        }
        if (requireAdminRole && user.role !== "ADMIN") {
          return res.status(403).json({ error: "Admin access required" });
        }
        req.user = user;
        next();
      })
      .catch(next);
  };
}

// Any logged-in staff member (ADMIN or TECHNICIAN).
export const requireAuth = guard(false);

// ADMIN only — financial data and catalog/config writes. Works standalone
// (doesn't need requireAuth to run first).
export const requireAdmin = guard(true);
