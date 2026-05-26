import { FormEvent, useState } from "react";
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

export function LoginPage({ theme, onThemeToggle, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let lastError = "Login failed";
    for (const base of API_BASES) {
      try {
        const response = await fetch(`${base}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const body = (await response.json().catch(() => ({}))) as {
          accessToken?: string;
          role?: string;
          username?: string;
          error?: string;
        };
        if (!response.ok) {
          lastError = body.error ?? `HTTP ${response.status}`;
          continue;
        }
        if (!body.accessToken) {
          lastError = "missing token";
          continue;
        }
        if (body.role !== "admin") {
          lastError = "Admin role required";
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
        <p className="auth-card__subtitle">Sign in with a messaging account that has role=admin.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
