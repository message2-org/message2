const API_BASES = ["/notifications", "http://localhost:4000/notifications", "http://localhost:4003"] as const;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function fetchPushConfig() {
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}/push/config`);
      if (!response.ok) continue;
      return (await response.json()) as {
        webPushEnabled: boolean;
        vapidPublicKey: string | null;
        pushDryRun?: boolean;
      };
    } catch {
      // try next base
    }
  }
  return null;
}

async function postSubscribe(accessToken: string, subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}/push/web/subscribe`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
        })
      });
      if (response.ok) return true;
    } catch {
      // try next base
    }
  }
  return false;
}

/** Register service worker and Web Push subscription when the browser allows it. */
export async function registerWebPush(accessToken: string): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in navigator) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const config = await fetchPushConfig();
  if (!config?.webPushEnabled || !config.vapidPublicKey) {
    return { ok: false, reason: "disabled" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey)
    });
  }

  const saved = await postSubscribe(accessToken, subscription);
  return saved ? { ok: true } : { ok: false, reason: "subscribe_failed" };
}
