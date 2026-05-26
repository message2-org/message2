export type DeploymentProfile = "public" | "corporate";

export type CorporateConnectivityMode = "isolated" | "federation" | "public_bridge";

export type InstallConfig = {
  deploymentProfile: DeploymentProfile;
  connectivity: CorporateConnectivityMode;
  lawfulAccessEnabled: boolean;
};

export const INSTALL_KEY = "message2.admin.install.v1";

export const CONNECTIVITY_MODES: readonly CorporateConnectivityMode[] = [
  "isolated",
  "federation",
  "public_bridge"
] as const;

export type ConnectivityOption = {
  value: CorporateConnectivityMode;
  title: string;
  summary: string;
  recommended?: boolean;
  caution?: boolean;
};

export const CONNECTIVITY_OPTIONS: readonly ConnectivityOption[] = [
  {
    value: "isolated",
    title: "Isolated",
    summary:
      "Single instance inside the private perimeter. No cross-instance messaging; lowest exposure.",
    recommended: true
  },
  {
    value: "federation",
    title: "Federation",
    summary:
      "Trusted corporate peers only (mTLS + allowlist). Use when multiple internal instances must interoperate.",
    recommended: true
  },
  {
    value: "public_bridge",
    title: "Public bridge",
    summary:
      "Controlled link to a public Message2 instance. Higher risk — enable only with explicit security approval.",
    caution: true
  }
] as const;

export type InstanceProfileSnapshot = {
  deploymentProfile: DeploymentProfile;
  lawfulAccessEnabled: boolean;
  userTransparencyEnabled?: boolean;
  corporateConnectivity: CorporateConnectivityMode;
};

const isConnectivityMode = (raw: unknown): raw is CorporateConnectivityMode =>
  typeof raw === "string" && (CONNECTIVITY_MODES as readonly string[]).includes(raw);

const isDeploymentProfile = (raw: unknown): raw is DeploymentProfile =>
  raw === "public" || raw === "corporate";

export const normalizeInstallConfig = (raw: Partial<InstallConfig>): InstallConfig => {
  const deploymentProfile = isDeploymentProfile(raw.deploymentProfile) ? raw.deploymentProfile : "public";
  const connectivity = isConnectivityMode(raw.connectivity) ? raw.connectivity : "isolated";
  const lawfulAccessEnabled =
    deploymentProfile === "public" ? raw.lawfulAccessEnabled !== false : false;
  return { deploymentProfile, connectivity, lawfulAccessEnabled };
};

export const readInstallConfig = (): InstallConfig => {
  try {
    const stored = localStorage.getItem(INSTALL_KEY);
    if (!stored) {
      return normalizeInstallConfig({});
    }
    return normalizeInstallConfig(JSON.parse(stored) as Partial<InstallConfig>);
  } catch {
    return normalizeInstallConfig({});
  }
};

export const writeInstallConfig = (config: InstallConfig): InstallConfig => {
  const next = normalizeInstallConfig(config);
  localStorage.setItem(INSTALL_KEY, JSON.stringify(next));
  return next;
};

export type EnvSnippet = {
  compose: string;
  dotenv: string;
};

export const buildEnvSnippets = (config: InstallConfig): EnvSnippet => {
  const normalized = normalizeInstallConfig(config);
  const lawful = normalized.lawfulAccessEnabled ? "true" : "false";
  const connectivity =
    normalized.deploymentProfile === "corporate" ? normalized.connectivity : "isolated";

  const dotenv = [
    `DEPLOYMENT_PROFILE=${normalized.deploymentProfile}`,
    `LAWFUL_ACCESS_ENABLED=${lawful}`,
    `CORPORATE_CONNECTIVITY_MODE=${connectivity}`
  ].join("\n");

  const compose = [
    `MESSAGE2_DEPLOYMENT_PROFILE=${normalized.deploymentProfile}`,
    `MESSAGE2_LAWFUL_ACCESS_ENABLED=${lawful}`,
    `MESSAGE2_CORPORATE_CONNECTIVITY_MODE=${connectivity}`
  ].join("\n");

  return { dotenv, compose };
};

export type ProfileDrift = {
  field: "deploymentProfile" | "lawfulAccessEnabled" | "corporateConnectivity";
  local: string;
  server: string;
};

export const compareInstallToServer = (
  local: InstallConfig,
  server: InstanceProfileSnapshot
): ProfileDrift[] => {
  const normalized = normalizeInstallConfig(local);
  const drifts: ProfileDrift[] = [];

  if (normalized.deploymentProfile !== server.deploymentProfile) {
    drifts.push({
      field: "deploymentProfile",
      local: normalized.deploymentProfile,
      server: server.deploymentProfile
    });
  }

  if (normalized.lawfulAccessEnabled !== server.lawfulAccessEnabled) {
    drifts.push({
      field: "lawfulAccessEnabled",
      local: String(normalized.lawfulAccessEnabled),
      server: String(server.lawfulAccessEnabled)
    });
  }

  if (
    normalized.deploymentProfile === "corporate" &&
    normalized.connectivity !== server.corporateConnectivity
  ) {
    drifts.push({
      field: "corporateConnectivity",
      local: normalized.connectivity,
      server: server.corporateConnectivity
    });
  }

  return drifts;
};
