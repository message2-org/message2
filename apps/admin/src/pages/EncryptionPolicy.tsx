import { FormEvent, useEffect, useState } from "react";

type EncryptionMode = "metadata_only" | "server_encrypted" | "e2ee_strict";

type Policy = {
  defaultMode: EncryptionMode;
  minMode: EncryptionMode;
  maxMode: EncryptionMode;
};

const MODES: EncryptionMode[] = ["metadata_only", "server_encrypted", "e2ee_strict"];

const API_BASES = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"];

export function EncryptionPolicy({ accessToken }: { accessToken: string }) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      for (const base of API_BASES) {
        try {
          const response = await fetch(`${base}/admin/encryption/policy`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!response.ok) continue;
          setPolicy((await response.json()) as Policy);
          return;
        } catch {
          /* try next */
        }
      }
      setError("Failed to load encryption policy");
    };
    void load();
  }, [accessToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setSaved(false);
    setError(null);
    for (const base of API_BASES) {
      try {
        const response = await fetch(`${base}/admin/encryption/policy`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify(policy)
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `HTTP ${response.status}`);
          return;
        }
        setPolicy((await response.json()) as Policy);
        setSaved(true);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "save failed");
      }
    }
  };

  if (!policy) {
    return (
      <section className="admin-card">
        <p className="muted">{error ?? "Loading encryption policy…"}</p>
      </section>
    );
  }

  return (
    <form className="admin-card" onSubmit={handleSubmit}>
      <h2>Encryption policy</h2>
      <p className="muted">Instance defaults and allowed range (P5). DM downgrades require peer consent in the messenger.</p>

      {(["minMode", "defaultMode", "maxMode"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={field}>{field}</label>
          <select
            id={field}
            value={policy[field]}
            onChange={(e) =>
              setPolicy((prev) => (prev ? { ...prev, [field]: e.target.value as EncryptionMode } : prev))
            }
          >
            {MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      ))}

      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="muted">Policy saved.</p> : null}
      <button className="primary" type="submit">
        Save policy
      </button>
    </form>
  );
}
