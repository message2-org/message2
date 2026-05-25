import { useEffect, useState } from "react";

type Complaint = {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  status: string;
  outcomeSummary?: string;
  createdAt: string;
};

const AUDIT_BASES = ["/access-audit", "http://localhost:4000/access-audit", "http://localhost:4004"];

export function ComplaintsQueue({ accessToken }: { accessToken: string }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    setError(null);
    const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
    for (const base of AUDIT_BASES) {
      try {
        const response = await fetch(`${base}/complaints${query}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          setError(`Failed: HTTP ${response.status}`);
          continue;
        }
        setComplaints((await response.json()) as Complaint[]);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "network error");
      }
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken, filter]);

  const updateStatus = async (id: string, status: string, outcomeSummary?: string) => {
    for (const base of AUDIT_BASES) {
      try {
        const response = await fetch(`${base}/complaints/${id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ status, outcomeSummary })
        });
        if (response.ok) {
          await load();
          return;
        }
      } catch {
        /* try next base */
      }
    }
    setError("Update failed");
  };

  return (
    <section className="admin-card">
      <h2>Complaint queue</h2>
      <label htmlFor="status-filter">Status filter</label>
      <select id="status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="pending">pending</option>
        <option value="upheld">upheld</option>
        <option value="rejected">rejected</option>
        <option value="referred_internal">referred_internal</option>
        <option value="operator_error_confirmed">operator_error_confirmed</option>
        <option value="">all</option>
      </select>
      <button type="button" className="primary" onClick={() => void load()}>
        Refresh
      </button>
      {error ? <p className="error">{error}</p> : null}
      {complaints.length === 0 ? <p className="muted">No complaints.</p> : null}
      {complaints.map((row) => (
        <article key={row.id} className="complaint-row">
          <p>
            <strong>Event</strong> {row.eventId} · <strong>User</strong> {row.userId}
          </p>
          <p className="muted">{new Date(row.createdAt).toLocaleString()} · {row.status}</p>
          <p>{row.body}</p>
          {row.outcomeSummary ? <p className="muted">Outcome: {row.outcomeSummary}</p> : null}
          {row.status === "pending" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" onClick={() => void updateStatus(row.id, "upheld", "Review completed.")}>
                Uphold
              </button>
              <button type="button" onClick={() => void updateStatus(row.id, "rejected", "Request within lawful scope.")}>
                Reject
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(row.id, "operator_error_confirmed", "Operator error logged.")}
              >
                Operator error
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
