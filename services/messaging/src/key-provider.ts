import { createHash } from "node:crypto";

type MasterSecrets = {
  provider: "env" | "vault";
  currentSecret: string;
  previousSecret: string | null;
};

const fromEnv = (fallbackSecret: string): MasterSecrets => {
  const currentSecret = process.env.DATA_ENCRYPTION_MASTER_KEY ?? fallbackSecret;
  const previousSecret = process.env.DATA_ENCRYPTION_MASTER_KEY_PREVIOUS?.trim() || null;
  return {
    provider: "env",
    currentSecret,
    previousSecret
  };
};

const fromVault = async (): Promise<MasterSecrets> => {
  const vaultAddr = process.env.VAULT_ADDR?.trim();
  const vaultToken = process.env.VAULT_TOKEN?.trim();
  const vaultKvPath = process.env.VAULT_KV_PATH?.trim();
  const currentField = process.env.VAULT_CURRENT_SECRET_FIELD?.trim() || "current";
  const previousField = process.env.VAULT_PREVIOUS_SECRET_FIELD?.trim() || "previous";

  if (!vaultAddr || !vaultToken || !vaultKvPath) {
    throw new Error("vault key provider requires VAULT_ADDR, VAULT_TOKEN, and VAULT_KV_PATH");
  }

  const baseUrl = vaultAddr.endsWith("/") ? vaultAddr.slice(0, -1) : vaultAddr;
  const path = vaultKvPath.startsWith("/") ? vaultKvPath : `/${vaultKvPath}`;
  const response = await fetch(`${baseUrl}/v1${path}`, {
    method: "GET",
    headers: {
      "X-Vault-Token": vaultToken
    }
  });

  if (!response.ok) {
    throw new Error(`vault key provider request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { data?: Record<string, unknown> };
  };
  const data = payload.data?.data;
  const currentSecret = typeof data?.[currentField] === "string" ? data[currentField] : null;
  const previousSecret = typeof data?.[previousField] === "string" ? data[previousField] : null;
  if (!currentSecret) {
    throw new Error(`vault key provider missing current secret field "${currentField}"`);
  }

  return {
    provider: "vault",
    currentSecret,
    previousSecret
  };
};

export const loadMasterKeys = async (fallbackSecret: string) => {
  const provider = (process.env.KEY_PROVIDER?.trim().toLowerCase() || "env") as "env" | "vault";
  const masterSecrets = provider === "vault" ? await fromVault() : fromEnv(fallbackSecret);
  const keys = [
    createHash("sha256").update(masterSecrets.currentSecret).digest(),
    ...(masterSecrets.previousSecret ? [createHash("sha256").update(masterSecrets.previousSecret).digest()] : [])
  ];
  return {
    provider: masterSecrets.provider,
    keys
  };
};
