export type InstanceProfile = {
  deploymentProfile?: "public" | "corporate";
  lawfulAccessEnabled?: boolean;
  userTransparencyEnabled?: boolean;
  corporateConnectivity?: string;
};

const OFFICIAL_HOSTS = new Set([
  "message2.ru",
  "www.message2.ru",
  "послание2.рф",
  "www.послание2.рф",
  "xn--80aaf6a3a.xn--p1ai",
  "www.xn--80aaf6a3a.xn--p1ai"
]);

export function isOfficialSite(hostname = window.location.hostname): boolean {
  const normalized = hostname.trim().toLowerCase();
  return OFFICIAL_HOSTS.has(normalized);
}

export async function fetchInstanceProfile(): Promise<InstanceProfile | null> {
  try {
    const response = await fetch("/messaging/instance/profile", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as InstanceProfile;
  } catch {
    return null;
  }
}
