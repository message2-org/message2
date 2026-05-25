import { FormEvent, useState } from "react";
import type { AdminSession } from "../App";

const API_BASES = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"];

export function LoginPage({ onLogin }: { onLogin: (session: AdminSession) => void }) {
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
    <div className="admin-shell">
      <form className="admin-card" onSubmit={handleSubmit}>
        <h1>Admin sign in</h1>
        <p className="muted">Use a messaging account with role=admin.</p>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
