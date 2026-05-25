import type { FcmRegisterInput, WebPushSubscriptionInput } from "@message2/contracts";
import { randomUUID } from "node:crypto";

type WebRow = WebPushSubscriptionInput & { id: string; userId: string; userAgent?: string };
type FcmRow = { id: string; userId: string; token: string; platform: string };

const webByEndpoint = new Map<string, WebRow>();
const webByUser = new Map<string, Set<string>>();
const fcmByToken = new Map<string, FcmRow>();
const fcmByUser = new Map<string, Set<string>>();

export const resetPushStoreForTests = () => {
  webByEndpoint.clear();
  webByUser.clear();
  fcmByToken.clear();
  fcmByUser.clear();
};

export const upsertWebPushSubscription = async (
  userId: string,
  input: WebPushSubscriptionInput,
  userAgent?: string
) => {
  const row: WebRow = {
    id: randomUUID(),
    userId,
    endpoint: input.endpoint,
    keys: input.keys,
    userAgent
  };
  webByEndpoint.set(input.endpoint, row);
  const set = webByUser.get(userId) ?? new Set();
  set.add(input.endpoint);
  webByUser.set(userId, set);
};

export const removeWebPushSubscription = async (userId: string, endpoint: string) => {
  const row = webByEndpoint.get(endpoint);
  if (!row || row.userId !== userId) return false;
  webByEndpoint.delete(endpoint);
  webByUser.get(userId)?.delete(endpoint);
  return true;
};

export const listWebPushForUsers = async (userIds: string[]) => {
  const rows: WebRow[] = [];
  for (const userId of userIds) {
    const endpoints = webByUser.get(userId);
    if (!endpoints) continue;
    for (const endpoint of endpoints) {
      const row = webByEndpoint.get(endpoint);
      if (row) rows.push(row);
    }
  }
  return rows;
};

export const upsertFcmToken = async (userId: string, input: FcmRegisterInput) => {
  const platform = input.platform ?? "android";
  const row: FcmRow = { id: randomUUID(), userId, token: input.token, platform };
  fcmByToken.set(input.token, row);
  const set = fcmByUser.get(userId) ?? new Set();
  set.add(input.token);
  fcmByUser.set(userId, set);
};

export const listFcmForUsers = async (userIds: string[]) => {
  const rows: FcmRow[] = [];
  for (const userId of userIds) {
    const tokens = fcmByUser.get(userId);
    if (!tokens) continue;
    for (const token of tokens) {
      const row = fcmByToken.get(token);
      if (row) rows.push(row);
    }
  }
  return rows;
};
