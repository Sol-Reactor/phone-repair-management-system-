import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../../lib/auth";
import { useLanguage } from "../../lib/i18n";
import { Button, Card, ErrorText, Label, TextInput } from "../../components/ui";

type LocationState = { message?: string; from?: string } | null;

export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      // Send them back to whatever they were trying to reach, if we know it
      // — falls back to the queue dashboard, which both ADMIN and
      // TECHNICIAN can land on (RequireAdmin/RequireAuth take it from there
      // if they try to reach something their role can't).
      navigate(state?.from ?? "/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("admin.login.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white font-bold text-lg dark:shadow-glow">
            Q
          </span>
          <span className="font-semibold text-slate-800 dark:text-white tracking-tight">PRQMS</span>
        </div>

        <Card className="shadow-md">
          <h1 className="text-lg font-semibold text-slate-800 mb-5 text-center dark:text-white">
            {t("admin.login.title")}
          </h1>

          {state?.message && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">
              {state.message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-login-f1">{t("admin.login.emailLabel")}</Label>
              <TextInput id="admin-login-f1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-login-f2">{t("admin.login.passwordLabel")}</Label>
              <TextInput id="admin-login-f2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <ErrorText>{error}</ErrorText>

            <Button type="submit" className="w-full" loading={submitting}>
              {submitting ? t("admin.login.signingIn") : t("admin.login.signIn")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
