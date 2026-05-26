import type {
  DevicePrekeyBundlePublishedV1,
  DevicePrekeyBundleSummaryV1,
  PublishDevicePrekeyBundleInputV1
} from "@message2/contracts";

export const API_BASE_URLS = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"] as const;

async function fetchMessaging(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  for (const baseUrl of API_BASE_URLS) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok || res.status < 500) return res;
    } catch {
      /* try next base */
    }
  }
  return null;
}

export async function publishPrekeyBundle(
  token: string,
  deviceId: string,
  input: PublishDevicePrekeyBundleInputV1
): Promise<DevicePrekeyBundleSummaryV1 | null> {
  const res = await fetchMessaging(token, `/e2ee/devices/${encodeURIComponent(deviceId)}/bundle`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
  if (!res?.ok) return null;
  return (await res.json()) as DevicePrekeyBundleSummaryV1;
}

export async function listMyDevices(token: string): Promise<DevicePrekeyBundleSummaryV1[]> {
  const res = await fetchMessaging(token, "/e2ee/me/devices");
  if (!res?.ok) return [];
  const body = (await res.json()) as { devices: DevicePrekeyBundleSummaryV1[] };
  return body.devices ?? [];
}

export async function fetchPeerPrekeyBundle(
  token: string,
  userId: string,
  deviceId?: string,
  options?: { requireDmPeer?: boolean }
): Promise<DevicePrekeyBundlePublishedV1 | null> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  if (options?.requireDmPeer) qs.set("dm_peer_required", "true");
  const query = qs.toString();
  const res = await fetchMessaging(
    token,
    `/e2ee/users/${encodeURIComponent(userId)}/bundle${query ? `?${query}` : ""}`
  );
  if (!res?.ok) return null;
  return (await res.json()) as DevicePrekeyBundlePublishedV1;
}
