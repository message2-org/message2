import type { AuthUser } from "../types";
import type { RefreshTokens } from "./types";

export const API_BASE_URLS = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"] as const;

export const UNAUTHORIZED_ERROR = "UNAUTHORIZED";

export class AuthRequestError extends Error {
  readonly kind = "auth" as const;
}

export class NetworkRequestError extends Error {
  readonly kind = "network" as const;
}

export function isAuthRequestError(error: unknown): error is AuthRequestError {
  return error instanceof AuthRequestError;
}

function isFailedFetch(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.message === "Failed to fetch");
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  let lastNetworkError: NetworkRequestError | null = null;
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.status === 401) {
        throw new AuthRequestError(UNAUTHORIZED_ERROR);
      }
      if (!response.ok) {
        if (response.status >= 500) continue;
        throw new AuthRequestError(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as AuthUser;
      const displayName = String(data.displayName ?? "").trim();
      if (data.id && data.username && displayName) {
        return { ...data, displayName };
      }
      throw new AuthRequestError("invalid profile payload");
    } catch (error) {
      if (error instanceof AuthRequestError) throw error;
      if (error instanceof Error && !isFailedFetch(error)) {
        throw new AuthRequestError(error.message);
      }
      lastNetworkError = new NetworkRequestError("Failed to load profile");
    }
  }
  throw lastNetworkError ?? new AuthRequestError("Failed to load profile");
}

export async function fetchRefresh(refreshToken: string): Promise<RefreshTokens> {
  let lastNetworkError: NetworkRequestError | null = null;
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (response.status === 401 || response.status === 403) {
        throw new AuthRequestError("invalid refresh token");
      }
      if (!response.ok) {
        if (response.status >= 500) continue;
        throw new AuthRequestError(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as RefreshTokens;
      if (data.accessToken && data.refreshToken) return data;
      throw new AuthRequestError("invalid refresh payload");
    } catch (error) {
      if (error instanceof AuthRequestError) throw error;
      if (error instanceof Error && !isFailedFetch(error)) {
        throw new AuthRequestError(error.message);
      }
      lastNetworkError = new NetworkRequestError("Refresh request failed");
    }
  }
  throw lastNetworkError ?? new AuthRequestError("Refresh request failed");
}
