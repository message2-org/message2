import { readInstanceProfileFromEnv } from "@message2/contracts";

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
  get corporateConnectivity() {
    return readInstanceProfileFromEnv().corporateConnectivity;
  },
  get notificationsUrl() {
    return process.env.NOTIFICATIONS_URL ?? "http://localhost:4003";
  },
  get messagingUrl() {
    return process.env.MESSAGING_URL ?? "http://localhost:4001";
  },
  get internalServiceSecret() {
    return process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal";
  },
  get jwtSecret() {
    return process.env.JWT_SECRET ?? "change-me-in-production";
  },
  get auditStore(): "memory" | "postgres" {
    if (process.env.AUDIT_STORE === "memory") return "memory";
    if (process.env.DATABASE_URL) return "postgres";
    return "memory";
  },
  get siemWebhookUrl() {
    return process.env.SIEM_WEBHOOK_URL ?? "";
  },
  get siemExportMaxRecords() {
    const raw = Number(process.env.SIEM_EXPORT_MAX_RECORDS ?? "1000");
    return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 10_000) : 1000;
  }
};
