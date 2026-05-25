import type { DeploymentProfile } from "./lawful.js";

export type EncryptionMode = "metadata_only" | "server_encrypted" | "e2ee_strict";

export const ENCRYPTION_MODES: readonly EncryptionMode[] = [
  "metadata_only",
  "server_encrypted",
  "e2ee_strict"
] as const;

export const ENCRYPTION_MODE_STRENGTH: Record<EncryptionMode, number> = {
  metadata_only: 0,
  server_encrypted: 1,
  e2ee_strict: 2
};

export type InstanceEncryptionPolicy = {
  defaultMode: EncryptionMode;
  minMode: EncryptionMode;
  maxMode: EncryptionMode;
};

export const isEncryptionMode = (value: string): value is EncryptionMode =>
  ENCRYPTION_MODES.includes(value as EncryptionMode);

export const encryptionModeStrength = (mode: EncryptionMode): number => ENCRYPTION_MODE_STRENGTH[mode];

export const isEncryptionDowngrade = (from: EncryptionMode, to: EncryptionMode): boolean =>
  encryptionModeStrength(to) < encryptionModeStrength(from);

export const isWithinEncryptionBounds = (mode: EncryptionMode, policy: InstanceEncryptionPolicy): boolean =>
  encryptionModeStrength(mode) >= encryptionModeStrength(policy.minMode) &&
  encryptionModeStrength(mode) <= encryptionModeStrength(policy.maxMode);

export const clampEncryptionMode = (mode: EncryptionMode, policy: InstanceEncryptionPolicy): EncryptionMode => {
  if (encryptionModeStrength(mode) < encryptionModeStrength(policy.minMode)) return policy.minMode;
  if (encryptionModeStrength(mode) > encryptionModeStrength(policy.maxMode)) return policy.maxMode;
  return mode;
};

export const defaultInstanceEncryptionPolicy = (
  deploymentProfile: DeploymentProfile = "public"
): InstanceEncryptionPolicy => {
  if (deploymentProfile === "corporate") {
    return {
      defaultMode: "server_encrypted",
      minMode: "metadata_only",
      maxMode: "e2ee_strict"
    };
  }
  return {
    defaultMode: "server_encrypted",
    minMode: "metadata_only",
    maxMode: "e2ee_strict"
  };
};

export const resolveEffectiveEncryptionMode = (
  chatMode: EncryptionMode | null | undefined,
  policy: InstanceEncryptionPolicy
): EncryptionMode => {
  if (chatMode && isEncryptionMode(chatMode)) {
    return clampEncryptionMode(chatMode, policy);
  }
  return policy.defaultMode;
};

export const isValidInstancePolicyShape = (policy: InstanceEncryptionPolicy): boolean => {
  const min = encryptionModeStrength(policy.minMode);
  const max = encryptionModeStrength(policy.maxMode);
  const def = encryptionModeStrength(policy.defaultMode);
  return min <= max && def >= min && def <= max;
};
