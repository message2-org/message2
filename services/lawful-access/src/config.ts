import { readInstanceProfileFromEnv } from "@message2/contracts";

const parseAllowlist = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const config = {
  get deploymentProfile() {
    return readInstanceProfileFromEnv().deploymentProfile;
  },
  get lawfulAccessEnabled() {
    return readInstanceProfileFromEnv().lawfulAccessEnabled;
  },
  get userTransparencyEnabled() {
    return readInstanceProfileFromEnv().userTransparencyEnabled;
  },
  get accessAuditUrl() {
    return process.env.ACCESS_AUDIT_URL ?? "http://localhost:4004";
  },
  get internalServiceSecret() {
    return process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal";
  },
  get mtlsRequired() {
    return process.env.LAWFUL_MTLS_REQUIRED === "true";
  },
  get apiSharedSecret() {
    return process.env.LAWFUL_API_SHARED_SECRET ?? "";
  },
  get ipAllowlist() {
    return parseAllowlist(process.env.LAWFUL_IP_ALLOWLIST);
  }
};
