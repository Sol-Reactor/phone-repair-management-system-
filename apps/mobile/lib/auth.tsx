import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  login as apiLogin,
  logout as apiLogout,
  fetchMe,
  setOnUnauthorized,
  TOKEN_KEY,
  StaffUser,
} from "./api";

type AuthContextValue = {
  user: StaffUser | null;
  // True until we've finished checking for an existing token on first
  // launch — screens should wait for this before deciding to redirect to
  // /login, or a logged-in user briefly bounces there on every app start.
  loading: boolean;
  isAuthenticated: boolean;
  // True only for role === "ADMIN" — a TECHNICIAN is authenticated but not
  // an admin (mirrors the web app's lib/auth.tsx).
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If any API call 401s later (expired/invalid token), drop straight
    // back to "logged out" state instead of leaving stale UI up.
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    (async () => {
      // Everything here — including the AsyncStorage read itself — must be
      // inside this try/catch. If AsyncStorage's native module isn't
      // available (version mismatch with the Expo Go build, storage
      // corruption, whatever) an unguarded throw here used to skip
      // setLoading(false) entirely, leaving the app stuck on the loading
      // spinner forever and never reaching /login. Any failure now just
      // falls through to "not logged in" instead of hanging.
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return;
        setUser(await fetchMe());
      } catch {
        setUser(null);
        await apiLogout().catch(() => undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
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
