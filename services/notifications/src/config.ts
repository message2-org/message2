const truthy = (value: string | undefined) => (value ?? "").toLowerCase() === "true";

export const config = {
  port: Number(process.env.PORT ?? 4003),
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal",
  pushStore: (process.env.PUSH_STORE ?? "postgres") as "postgres" | "memory",
  databaseUrl: process.env.DATABASE_URL ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@localhost",
  fcmLegacyServerKey: process.env.FCM_LEGACY_SERVER_KEY ?? "",
  fcmEnabled: truthy(process.env.FCM_ENABLED) || Boolean(process.env.FCM_LEGACY_SERVER_KEY),
  webPushEnabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  pushDryRun:
    truthy(process.env.PUSH_DRY_RUN) ||
    (!process.env.VAPID_PUBLIC_KEY && !process.env.FCM_LEGACY_SERVER_KEY && !truthy(process.env.FCM_ENABLED))
};
