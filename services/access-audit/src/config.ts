import type { DeploymentProfile } from "@message2/contracts";

const parseDeploymentProfile = (raw: string | undefined): DeploymentProfile => {
  if (raw === "corporate") return "corporate";
  return "public";
};

export const config = {
  deploymentProfile: parseDeploymentProfile(process.env.DEPLOYMENT_PROFILE),
  lawfulAccessEnabled:
    process.env.LAWFUL_ACCESS_ENABLED === "true" ||
    (process.env.LAWFUL_ACCESS_ENABLED !== "false" && process.env.DEPLOYMENT_PROFILE !== "corporate"),
  notificationsUrl: process.env.NOTIFICATIONS_URL ?? "http://localhost:4003",
  messagingUrl: process.env.MESSAGING_URL ?? "http://localhost:4001",
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production"
};
