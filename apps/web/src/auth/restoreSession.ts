import { fetchMe, fetchRefresh, isAuthRequestError } from "./api";
import { clearStoredSession, readStoredSession, saveStoredSession } from "./storage";
import type { StoredSession } from "./types";

export type RestoreSessionResult =
  | { status: "none" }
  | { status: "restored"; session: StoredSession; fromCache?: boolean }
  | { status: "cleared" };

export async function restoreSession(): Promise<RestoreSessionResult> {
  const stored = readStoredSession();
  if (!stored) return { status: "none" };

  try {
    const user = await fetchMe(stored.accessToken);
    const session: StoredSession = { ...stored, user };
    saveStoredSession(session);
    return { status: "restored", session };
  } catch (error) {
    if (!isAuthRequestError(error)) {
      return { status: "restored", session: stored, fromCache: true };
    }
  }

  try {
    const refreshed = await fetchRefresh(stored.refreshToken);
    const user = await fetchMe(refreshed.accessToken);
    const session: StoredSession = {
      user,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken
    };
    saveStoredSession(session);
    return { status: "restored", session };
  } catch (error) {
    if (isAuthRequestError(error)) {
      clearStoredSession();
      return { status: "cleared" };
    }
    return { status: "restored", session: stored, fromCache: true };
  }
}

export function getBootAuthState(): {
  session: StoredSession | null;
  authUser: StoredSession["user"] | null;
  shouldRestore: boolean;
} {
  const session = readStoredSession();
  return {
    session,
    authUser: session?.user ?? null,
    shouldRestore: session !== null
  };
}
