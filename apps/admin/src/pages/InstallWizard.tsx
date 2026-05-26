import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CONNECTIVITY_OPTIONS,
  buildEnvSnippets,
  compareInstallToServer,
  normalizeInstallConfig,
  readInstallConfig,
  writeInstallConfig,
  type InstallConfig,
  type InstanceProfileSnapshot
} from "../install-config";

const API_BASES = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"];

type InstallWizardProps = {
  accessToken?: string;
};

export function InstallWizard({ accessToken }: InstallWizardProps) {
  const [config, setConfig] = useState<InstallConfig>(readInstallConfig);
  const [saved, setSaved] = useState(false);
  const [serverProfile, setServerProfile] = useState<InstanceProfileSnapshot | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setServerProfile(null);
      setServerError(null);
      return;
    }

    const load = async () => {
      for (const base of API_BASES) {
        try {
          const response = await fetch(`${base}/instance/profile`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!response.ok) continue;
          const body = (await response.json()) as InstanceProfileSnapshot;
          setServerProfile(body);
          setServerError(null);
          return;
        } catch {
          /* try next */
        }
      }
      setServerProfile(null);
      setServerError("Could not load live instance profile (gateway/messaging offline?).");
    };

    void load();
  }, [accessToken]);

  const envSnippets = useMemo(() => buildEnvSnippets(config), [config]);
  const drifts = useMemo(
    () => (serverProfile ? compareInstallToServer(config, serverProfile) : []),
    [config, serverProfile]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = writeInstallConfig(config);
    setConfig(next);
    setSaved(true);
  };

  const selectedConnectivity = CONNECTIVITY_OPTIONS.find((o) => o.value === config.connectivity);

  return (
    <form className="admin-card install-wizard" onSubmit={handleSubmit}>
      <h2>Install wizard</h2>
      <p className="muted">
        Choose deployment profile and corporate connectivity. Saves locally (MVP); apply matching env on
        gateway, messaging, lawful-access, and access-audit.
      </p>

      <fieldset className="wizard-fieldset">
        <legend>Deployment profile</legend>
        <div className="wizard-radio-row">
          <label className={`wizard-choice${config.deploymentProfile === "public" ? " selected" : ""}`}>
            <input
              type="radio"
              name="deploymentProfile"
              value="public"
              checked={config.deploymentProfile === "public"}
              onChange={() =>
                setConfig((prev) =>
                  normalizeInstallConfig({
                    ...prev,
                    deploymentProfile: "public",
                    lawfulAccessEnabled: prev.lawfulAccessEnabled || true
                  })
                )
              }
            />
            <span className="wizard-choice-title">Public</span>
            <span className="wizard-choice-desc">
              Internet-facing instance. External lawful-access API and user transparency enabled by policy.
            </span>
          </label>
          <label className={`wizard-choice${config.deploymentProfile === "corporate" ? " selected" : ""}`}>
            <input
              type="radio"
              name="deploymentProfile"
              value="corporate"
              checked={config.deploymentProfile === "corporate"}
              onChange={() =>
                setConfig((prev) =>
                  normalizeInstallConfig({
                    ...prev,
                    deploymentProfile: "corporate",
                    lawfulAccessEnabled: false
                  })
                )
              }
            />
            <span className="wizard-choice-title">Corporate</span>
            <span className="wizard-choice-desc">
              Private perimeter. Lawful API off; encryption policy configurable in Admin; connectivity mode
              below is install-time and auditable.
            </span>
          </label>
        </div>
      </fieldset>

      {config.deploymentProfile === "corporate" ? (
        <fieldset className="wizard-fieldset">
          <legend>Corporate connectivity</legend>
          <p className="muted wizard-hint">
            Documented modes per deployment profile. Federation and bridge require additional infra (not
            fully implemented); this wizard records intent and env for operators.
          </p>
          <div className="wizard-connectivity-list">
            {CONNECTIVITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`wizard-choice wizard-choice-block${
                  config.connectivity === option.value ? " selected" : ""
                }${option.caution ? " caution" : ""}`}
              >
                <input
                  type="radio"
                  name="connectivity"
                  value={option.value}
                  checked={config.connectivity === option.value}
                  onChange={() => setConfig((prev) => ({ ...prev, connectivity: option.value }))}
                />
                <span className="wizard-choice-title">
                  {option.title}
                  {option.recommended ? <span className="wizard-tag">recommended</span> : null}
                  {option.caution ? <span className="wizard-tag caution">review required</span> : null}
                </span>
                <span className="wizard-choice-desc">{option.summary}</span>
              </label>
            ))}
          </div>
          {config.connectivity === "public_bridge" ? (
            <p className="wizard-callout caution" role="status">
              Public bridge links a corporate instance to a public operator. Confirm firewall rules, data
              classification, and legal review before enabling in production.
            </p>
          ) : null}
        </fieldset>
      ) : (
        <fieldset className="wizard-fieldset">
          <legend>Lawful access</legend>
          <label className="wizard-checkbox">
            <input
              type="checkbox"
              checked={config.lawfulAccessEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, lawfulAccessEnabled: e.target.checked }))}
            />
            Enable external lawful-access API (<code>lawful-access</code> service + gateway <code>/lawful</code>)
          </label>
          <p className="muted wizard-hint">
            When unchecked, set <code>LAWFUL_ACCESS_ENABLED=false</code> on all core services.
          </p>
        </fieldset>
      )}

      {serverProfile ? (
        <section className="wizard-server-panel" aria-live="polite">
          <h3>Live instance profile</h3>
          <dl className="wizard-dl">
            <dt>Profile</dt>
            <dd>{serverProfile.deploymentProfile}</dd>
            <dt>Lawful API</dt>
            <dd>{serverProfile.lawfulAccessEnabled ? "enabled" : "disabled"}</dd>
            <dt>Connectivity</dt>
            <dd>{serverProfile.corporateConnectivity}</dd>
          </dl>
          {drifts.length > 0 ? (
            <p className="wizard-callout warn" role="status">
              Saved wizard values differ from the running server. Apply env below and restart services, or
              update the wizard to match production.
              <ul>
                {drifts.map((d) => (
                  <li key={d.field}>
                    <code>{d.field}</code>: wizard <strong>{d.local}</strong> → server <strong>{d.server}</strong>
                  </li>
                ))}
              </ul>
            </p>
          ) : (
            <p className="muted">Wizard matches live <code>GET /instance/profile</code>.</p>
          )}
        </section>
      ) : accessToken && serverError ? (
        <p className="muted">{serverError}</p>
      ) : null}

      <button className="primary" type="submit">
        Save profile
      </button>

      {saved ? (
        <section className="wizard-env-panel">
          <p className="muted">
            Saved. Copy into service <code>.env</code> files or Docker Compose overrides, then restart
            affected services.
          </p>
          {selectedConnectivity?.caution ? (
            <p className="wizard-callout caution">
              You selected <strong>{selectedConnectivity.title}</strong> — double-check perimeter controls
              before deploy.
            </p>
          ) : null}
          <label htmlFor="env-dotenv">Service env (.env)</label>
          <textarea id="env-dotenv" readOnly rows={3} value={envSnippets.dotenv} />
          <label htmlFor="env-compose">Docker Compose (MESSAGE2_* prefix)</label>
          <textarea id="env-compose" readOnly rows={3} value={envSnippets.compose} />
        </section>
      ) : null}
    </form>
  );
}
