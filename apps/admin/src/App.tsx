import { useEffect, useState } from "react";
import { BrandLogo } from "./components/BrandLogo";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
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

type AdminView = "wizard" | "complaints" | "encryption" | "compliance";

const VIEW_META: Record<AdminView, { nav: string; title: string; subtitle: string }> = {
  wizard: {
    nav: "Install wizard",
    title: "Install wizard",
    subtitle: "Deployment profile and corporate connectivity"
  },
  complaints: {
    nav: "Complaints",
    title: "Complaints queue",
    subtitle: "Lawful-access transparency complaints"
  },
  encryption: {
    nav: "Encryption",
    title: "Encryption policy",
    subtitle: "Instance defaults and allowed modes"
  },
  compliance: {
    nav: "SIEM export",
    title: "SIEM export",
    subtitle: "Audit events and webhook forwarding"
  }
};

export function App() {
  const [theme, toggleTheme] = useTheme();
  const [session, setSession] = useState<AdminSession | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AdminSession) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<AdminView>("wizard");

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  if (!session) {
    return <LoginPage theme={theme} onThemeToggle={toggleTheme} onLogin={(next) => {
      setSession(next);
      setView("wizard");
    }} />;
  }

  const meta = VIEW_META[view];

  return (
    <main className={`layout theme-${theme}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <BrandLogo className="brand-logo" theme={theme} />
          <div>
            <h1>Message2</h1>
            <p className="muted">Admin console</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {(Object.keys(VIEW_META) as AdminView[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-nav-item${view === key ? " active" : ""}`}
              onClick={() => setView(key)}
            >
              {VIEW_META[key].nav}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="muted admin-sidebar-user">
            Signed in as <strong>{session.username}</strong>
          </p>
          <button
            type="button"
            className="admin-nav-item admin-nav-item--ghost"
            onClick={() => setSession(null)}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="pane-divider" aria-hidden="true" />

      <section className="admin-main">
        <header className="admin-main__header">
          <div>
            <h2>{meta.title}</h2>
            <p className="muted admin-main__subtitle">{meta.subtitle}</p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>

        <div className="admin-main__body">
          {view === "wizard" ? <InstallWizard accessToken={session.accessToken} /> : null}
          {view === "complaints" ? <ComplaintsQueue accessToken={session.accessToken} /> : null}
          {view === "encryption" ? <EncryptionPolicy accessToken={session.accessToken} /> : null}
          {view === "compliance" ? <ComplianceExport accessToken={session.accessToken} /> : null}
        </div>
      </section>
    </main>
  );
}
