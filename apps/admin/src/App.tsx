import { FormEvent, useEffect, useState } from "react";
import { ComplaintsQueue } from "./pages/ComplaintsQueue";
import { ComplianceExport } from "./pages/ComplianceExport";
import { EncryptionPolicy } from "./pages/EncryptionPolicy";
import { InstallWizard } from "./pages/InstallWizard";
import { LoginPage } from "./pages/LoginPage";

export type AdminSession = {
  accessToken: string;
  username: string;
};

const SESSION_KEY = "message2.admin.session.v1";

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AdminSession) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<"wizard" | "complaints" | "encryption" | "compliance">("wizard");

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  if (!session) {
    return (
      <LoginPage
        onLogin={(next) => {
          setSession(next);
          setView("wizard");
        }}
      />
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-card">
        <h1>Message2 Admin</h1>
        <p className="muted">Instance compliance console (lawful access P4 MVP)</p>
        <div className="admin-nav">
          <button type="button" className={view === "wizard" ? "active" : ""} onClick={() => setView("wizard")}>
            Install wizard
          </button>
          <button type="button" className={view === "complaints" ? "active" : ""} onClick={() => setView("complaints")}>
            Complaints
          </button>
          <button type="button" className={view === "encryption" ? "active" : ""} onClick={() => setView("encryption")}>
            Encryption
          </button>
          <button type="button" className={view === "compliance" ? "active" : ""} onClick={() => setView("compliance")}>
            SIEM export
          </button>
          <button
            type="button"
            onClick={() => {
              setSession(null);
            }}
          >
            Log out
          </button>
        </div>
        <p className="muted">Signed in as {session.username}</p>
      </header>

      {view === "wizard" ? <InstallWizard /> : null}
      {view === "complaints" ? <ComplaintsQueue accessToken={session.accessToken} /> : null}
      {view === "encryption" ? <EncryptionPolicy accessToken={session.accessToken} /> : null}
      {view === "compliance" ? <ComplianceExport accessToken={session.accessToken} /> : null}
    </div>
  );
}
