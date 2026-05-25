import { FormEvent, useState } from "react";

const INSTALL_KEY = "message2.admin.install.v1";

export type InstallConfig = {
  deploymentProfile: "public" | "corporate";
  connectivity: "isolated" | "federation" | "public_bridge";
  lawfulAccessEnabled: boolean;
};

const readConfig = (): InstallConfig => {
  try {
    const raw = localStorage.getItem(INSTALL_KEY);
    if (!raw) {
      return { deploymentProfile: "public", connectivity: "isolated", lawfulAccessEnabled: true };
    }
    return JSON.parse(raw) as InstallConfig;
  } catch {
    return { deploymentProfile: "public", connectivity: "isolated", lawfulAccessEnabled: true };
  }
};

export function InstallWizard() {
  const [config, setConfig] = useState<InstallConfig>(readConfig);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: InstallConfig = {
      ...config,
      lawfulAccessEnabled: config.deploymentProfile === "public" ? config.lawfulAccessEnabled : false
    };
    localStorage.setItem(INSTALL_KEY, JSON.stringify(next));
    setConfig(next);
    setSaved(true);
  };

  return (
    <form className="admin-card" onSubmit={handleSubmit}>
      <h2>Install wizard</h2>
      <p className="muted">Saves instance profile locally (MVP). Wire to server config API in a later phase.</p>

      <label htmlFor="profile">Deployment profile</label>
      <select
        id="profile"
        value={config.deploymentProfile}
        onChange={(e) =>
          setConfig((prev) => ({
            ...prev,
            deploymentProfile: e.target.value as InstallConfig["deploymentProfile"]
          }))
        }
      >
        <option value="public">public</option>
        <option value="corporate">corporate</option>
      </select>

      {config.deploymentProfile === "corporate" ? (
        <>
          <label htmlFor="connectivity">Corporate connectivity</label>
          <select
            id="connectivity"
            value={config.connectivity}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                connectivity: e.target.value as InstallConfig["connectivity"]
              }))
            }
          >
            <option value="isolated">isolated</option>
            <option value="federation">federation</option>
            <option value="public_bridge">public_bridge</option>
          </select>
        </>
      ) : (
        <label>
          <input
            type="checkbox"
            checked={config.lawfulAccessEnabled}
            onChange={(e) => setConfig((prev) => ({ ...prev, lawfulAccessEnabled: e.target.checked }))}
          />{" "}
          Enable external lawful-access API
        </label>
      )}

      <button className="primary" type="submit">
        Save profile
      </button>
      {saved ? <p className="muted">Saved. Apply matching env on gateway, lawful-access, and access-audit services.</p> : null}
    </form>
  );
}
