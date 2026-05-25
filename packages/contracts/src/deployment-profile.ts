import type { DeploymentProfile } from "./lawful.js";

export type CorporateConnectivityMode = "isolated" | "federation" | "public_bridge";

export const CORPORATE_CONNECTIVITY_MODES: readonly CorporateConnectivityMode[] = [
  "isolated",
  "federation",
  "public_bridge"
] as const;

export const parseDeploymentProfile = (raw: string | undefined): DeploymentProfile => {
  if (raw === "corporate") return "corporate";
  return "public";
};

export const parseCorporateConnectivityMode = (
  raw: string | undefined
): CorporateConnectivityMode => {
  if (raw === "federation" || raw === "public_bridge") return raw;
  return "isolated";
};

/** Lawful external API is allowed only on public profile and when explicitly enabled. */
export const resolveLawfulAccessEnabled = (
  deploymentProfile: DeploymentProfile,
  env: { lawfulAccessEnabled?: string; deploymentProfile?: string } = process.env
): boolean => {
  const profile = deploymentProfile ?? parseDeploymentProfile(env.deploymentProfile);
  if (profile === "corporate") return false;
  if (env.lawfulAccessEnabled === "true") return true;
  if (env.lawfulAccessEnabled === "false") return false;
  return true;
};

/** End-user transparency notices and complaints (public profile only). */
export const isUserTransparencyEnabled = (deploymentProfile: DeploymentProfile): boolean =>
  deploymentProfile === "public";

export type InstanceProfileSnapshot = {
  deploymentProfile: DeploymentProfile;
  lawfulAccessEnabled: boolean;
  userTransparencyEnabled: boolean;
  corporateConnectivity: CorporateConnectivityMode;
};

export const readInstanceProfileFromEnv = (
  env: NodeJS.ProcessEnv = process.env
): InstanceProfileSnapshot => {
  const deploymentProfile = parseDeploymentProfile(env.DEPLOYMENT_PROFILE);
  return {
    deploymentProfile,
    lawfulAccessEnabled: resolveLawfulAccessEnabled(deploymentProfile, {
      lawfulAccessEnabled: env.LAWFUL_ACCESS_ENABLED,
      deploymentProfile: env.DEPLOYMENT_PROFILE
    }),
    userTransparencyEnabled: isUserTransparencyEnabled(deploymentProfile),
    corporateConnectivity: parseCorporateConnectivityMode(env.CORPORATE_CONNECTIVITY_MODE)
  };
};
