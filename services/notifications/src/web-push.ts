import webpush from "web-push";
import { config } from "./config.js";
import { listWebPushForUsers } from "./store/index.js";

let configured = false;

const ensureConfigured = () => {
  if (configured || !config.webPushEnabled) return;
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
  configured = true;
};

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export const sendWebPushToUsers = async (userIds: string[], payload: PushPayload) => {
  if (userIds.length === 0) return { attempted: 0, sent: 0, failed: 0, dryRun: config.pushDryRun };

  const subs = await listWebPushForUsers(userIds);
  if (subs.length === 0) return { attempted: 0, sent: 0, failed: 0, dryRun: config.pushDryRun };

  if (config.pushDryRun || !config.webPushEnabled) {
    console.info("[notifications] web-push dry-run", { users: userIds.length, subs: subs.length, payload });
    return { attempted: subs.length, sent: subs.length, failed: 0, dryRun: true };
  }

  ensureConfigured();
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    const p256dh = "p256dh" in sub ? sub.p256dh : sub.keys.p256dh;
    const auth = "auth" in sub ? sub.auth : sub.keys.auth;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh, auth }
        },
        body
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      console.warn("[notifications] web-push failed", sub.endpoint, error);
    }
  }
  return { attempted: subs.length, sent, failed, dryRun: false };
};
