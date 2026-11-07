import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n";

// Gates the owner-only financial/config screens (wholesale, analytics,
// stock, settings, repair-types, price-list, messages). A TECHNICIAN is
// authenticated but isAdmin is false for them, so they get redirected same
// as a logged-out user would — RequireAuth is the one to use for screens
// both roles are allowed into.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  // Wait for the initial GET /admin/me (from an existing token) to resolve
  // before deciding — otherwise a logged-in admin flashes a redirect on
  // every page refresh.
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

  if (!isAdmin) {
    // Logged in, just not as an ADMIN — send TECHNICIANs somewhere they do
    // have access to instead of back to the login form they'd just re-pass.
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
