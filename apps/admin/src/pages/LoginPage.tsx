import { FormEvent, useEffect, useState } from "react";
import type { AdminSession } from "../App";
import { BrandLogo } from "../components/BrandLogo";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../hooks/useTheme";

const API_BASES = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"];

type LoginPageProps = {
  theme: Theme;
  onThemeToggle: () => void;
  onLogin: (session: AdminSession) => void;
};

type AuthMode = "login" | "bootstrap";

export function LoginPage({ theme, onThemeToggle, onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [canBootstrap, setCanBootstrap] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("Administrator");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const resolveBootstrapStatus = async () => {
      for (const base of API_BASES) {
        try {
          const response = await fetch(`${base}/auth/admin-bootstrap-status`);
          if (!response.ok) continue;
          const body = (await response.json().catch(() => ({}))) as { canBootstrap?: boolean };
          if (typeof body.canBootstrap !== "boolean") continue;
          if (!cancelled) {
            setCanBootstrap(body.canBootstrap);
            if (!body.canBootstrap) setMode("login");
          }
          return;
        } catch {
          // Try next API base.
        }
      }
    };
    void resolveBootstrapStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "bootstrap" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    let lastError = mode === "login" ? "Login failed" : "Admin bootstrap failed";
    for (const base of API_BASES) {
      try {
        const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
        const payload =
          mode === "login"
            ? { username, password }
            : { username, password, displayName, bootstrapAdmin: true };
        const response = await fetch(`${base}${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const body = (await response.json().catch(() => ({}))) as {
          accessToken?: string;
          role?: string;
          username?: string;
          error?: string;
        };
        if (!response.ok) {
          if (mode === "bootstrap" && response.status === 409) {
            if (body.error === "admin already exists") {
              lastError = "Administrator already exists. Use Sign in.";
            } else {
              lastError = "Username already exists. If admin is already created, switch to Sign in.";
            }
          } else {
            lastError = body.error ?? `HTTP ${response.status}`;
          }
          continue;
        }
        if (!body.accessToken) {
          lastError = "missing token";
          continue;
        }
        if (body.role !== "admin") {
          lastError = mode === "bootstrap" ? "Bootstrap works only if there is no administrator yet." : "Admin role required";
          continue;
        }
        onLogin({ accessToken: body.accessToken, username: body.username ?? username });
        setLoading(false);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "network error";
      }
    }
    setError(lastError);
    setLoading(false);
  };

  return (
    <main className={`auth-shell theme-${theme}`}>
      <div className="top-controls">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>

      <section className="auth-card">
        <BrandLogo className="brand-logo brand-logo--auth" theme={theme} />
        <h1>Message2 Admin</h1>
        <p className="auth-card__subtitle">
          {mode === "login"
            ? "Sign in with a messaging account that has role=admin."
            : "Create the first administrator while no admin account exists."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "bootstrap" ? (
            <div className="input-group">
              <div className="input-group__head">
                <label htmlFor="displayName">Display name (optional)</label>
              </div>
              <input
                id="displayName"
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
          ) : null}
          <div className="input-group">
            <div className="input-group__head">
              <label htmlFor="username">Username</label>
            </div>
            <input
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group">
            <div className="input-group__head">
              <label htmlFor="password">Password</label>
            </div>
            <input
              id="password"
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {mode === "bootstrap" ? (
            <div className="input-group">
              <div className="input-group__head">
                <label htmlFor="confirmPassword">Confirm password</label>
              </div>
              <input
                id="confirmPassword"
                className="form-control"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? (mode === "login" ? "Signing in..." : "Creating admin...") : mode === "login" ? "Sign in" : "Create first admin"}
          </button>
          {canBootstrap ? (
            <button
              type="button"
              className="auth-alt-switch"
              onClick={() => {
                setError(null);
                setMode((prev) => (prev === "login" ? "bootstrap" : "login"));
              }}
            >
              {mode === "login" ? "Fresh install? Create first admin" : "Admin already exists? Sign in"}
            </button>
          ) : null}
        </form>

        <div className="auth-hint-card">
          <p className="auth-hint-title">Quick start</p>
          <ul className="auth-hint-list">
            {canBootstrap ? <li>First run: open "Create first admin" and submit once.</li> : null}
            <li>Use "Sign in" with an account that has admin role.</li>
            <li>Bootstrap is blocked once any admin account exists.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
