import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { api, ApiError } from "./api";

export type Role = "ADMIN" | "TECHNICIAN";

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  user: StaffUser | null;
  // True once we've finished checking for an existing token on first load —
  // route guards should wait for this before deciding to redirect, or a
  // logged-in user gets bounced to /admin/login for a flash while the
  // GET /admin/me call is still in flight.
  loading: boolean;
  isAuthenticated: boolean;
  // True only for role === "ADMIN". Distinct from isAuthenticated: a
  // TECHNICIAN is authenticated but not an admin, and must not see
  // financial screens (wholesale, analytics, stock costs).
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the API who the session cookie belongs to (if any).
  // The cookie is httpOnly, so this is the only way to know — and the
  // server's answer reflects the current role, not a stale token claim.
  useEffect(() => {
    api
      .get<StaffUser>("/admin/me")
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: StaffUser }>("/admin/login", { email, password });
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "ADMIN",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiError };
