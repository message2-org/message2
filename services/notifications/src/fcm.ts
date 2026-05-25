import { config } from "./config.js";
import { listFcmForUsers } from "./store/index.js";
import type { PushPayload } from "./web-push.js";

export const sendFcmToUsers = async (userIds: string[], payload: PushPayload) => {
  if (userIds.length === 0) return { attempted: 0, sent: 0, failed: 0, dryRun: config.pushDryRun };

  const devices = await listFcmForUsers(userIds);
  if (devices.length === 0) return { attempted: 0, sent: 0, failed: 0, dryRun: config.pushDryRun };

  const tokens = devices.map((d) => d.token);
  if (config.pushDryRun || !config.fcmEnabled || !config.fcmLegacyServerKey) {
    console.info("[notifications] fcm dry-run", { users: userIds.length, tokens: tokens.length, payload });
    return { attempted: tokens.length, sent: tokens.length, failed: 0, dryRun: true };
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${config.fcmLegacyServerKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {}
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn("[notifications] fcm batch failed", response.status, text);
    return { attempted: tokens.length, sent: 0, failed: tokens.length, dryRun: false };
  }

  const result = (await response.json()) as { success?: number; failure?: number };
  return {
    attempted: tokens.length,
    sent: result.success ?? 0,
    failed: result.failure ?? 0,
    dryRun: false
  };
};
