import type { AuthUser } from "../types";

export const SESSION_STORAGE_KEY = "message2.auth.session.v1";

export type StoredSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RefreshTokens = {
  accessToken: string;
  refreshToken: string;
};
