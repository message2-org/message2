import type { StoredSession } from "./types";
import { SESSION_STORAGE_KEY } from "./types";

export function readStoredSession(): StoredSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.user || !parsed.accessToken || !parsed.refreshToken) return null;
    if (!parsed.user.id || !parsed.user.username) return null;
    const displayName = String(parsed.user.displayName ?? "").trim();
    if (!displayName) return null;
    return {
      user: { ...parsed.user, displayName },
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken
    };
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
