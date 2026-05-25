import { useState } from "react";

const API_BASES = ["/access-audit", "http://localhost:4000/access-audit", "http://localhost:4004"];

export function ComplianceExport({ accessToken }: { accessToken: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const downloadExport = async (format: "ndjson" | "cef") => {
    setLoading(true);
    setError(null);
    for (const base of API_BASES) {
      try {
        const response = await fetch(`${base}/admin/audit/export?format=${format}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          setError(`Export failed: HTTP ${response.status}`);
          continue;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `message2-audit-export.${format === "cef" ? "cef" : "ndjson"}`;
        anchor.click();
        URL.revokeObjectURL(url);
        setMessage(`Downloaded ${format} export`);
        setLoading(false);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "export failed");
      }
    }
    setLoading(false);
  };

  const forwardSiem = async () => {
    setLoading(true);
    setError(null);
    for (const base of API_BASES) {
      try {
        const response = await fetch(`${base}/admin/siem/forward`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const body = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          forwardedAuditEvents?: number;
        };
        if (!response.ok) {
          setError(body.error ?? `Forward failed: HTTP ${response.status}`);
          continue;
        }
        setMessage(
          `Forwarded ${body.forwardedAuditEvents ?? 0} audit records to SIEM webhook`
        );
        setLoading(false);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "forward failed");
      }
    }
    setLoading(false);
  };

  return (
    <section className="admin-card">
      <h2>Compliance export (SIEM)</h2>
      <p className="muted">
        Export privileged audit + complaints. Configure <code>SIEM_WEBHOOK_URL</code> in access-audit for
        forward.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="primary" disabled={loading} onClick={() => void downloadExport("ndjson")}>
          Download NDJSON
        </button>
        <button type="button" disabled={loading} onClick={() => void downloadExport("cef")}>
          Download CEF
        </button>
        <button type="button" disabled={loading} onClick={() => void forwardSiem()}>
          Forward to SIEM webhook
        </button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Runbooks: <code>docs/ops/compliance/</code>
      </p>
    </section>
  );
}
