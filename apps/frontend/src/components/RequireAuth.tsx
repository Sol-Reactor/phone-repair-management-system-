import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";

// Gates routes that either role can use (queue dashboard, registration,
// technician workspace, ticket slips). Contrast with RequireAdmin, which
// additionally checks role === "ADMIN" for the financial/owner-only screens.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  // Don't redirect until we know whether the existing token (if any) is
  // valid — otherwise a logged-in user briefly bounces to /login on refresh.
  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ message: t("admin.login.pleaseLogIn"), from: location.pathname }}
      />
    );
  }
  return <>{children}</>;
}
