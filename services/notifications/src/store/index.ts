import type { FcmRegisterInput, WebPushSubscriptionInput } from "@message2/contracts";
import { config } from "../config.js";
import * as memory from "./memory.js";
import * as postgres from "./postgres.js";

export const resetPushStoreForTests = () => {
  if (config.pushStore !== "memory") {
    throw new Error("resetPushStoreForTests requires PUSH_STORE=memory");
  }
  memory.resetPushStoreForTests();
};

const usePostgres = () => config.pushStore === "postgres";

export const upsertWebPushSubscription = (userId: string, input: WebPushSubscriptionInput, userAgent?: string) =>
  usePostgres() ? postgres.upsertWebPushSubscription(userId, input, userAgent) : memory.upsertWebPushSubscription(userId, input, userAgent);

export const removeWebPushSubscription = (userId: string, endpoint: string) =>
  usePostgres() ? postgres.removeWebPushSubscription(userId, endpoint) : memory.removeWebPushSubscription(userId, endpoint);

export const listWebPushForUsers = (userIds: string[]) =>
  usePostgres() ? postgres.listWebPushForUsers(userIds) : memory.listWebPushForUsers(userIds);

export const upsertFcmToken = (userId: string, input: FcmRegisterInput) =>
  usePostgres() ? postgres.upsertFcmToken(userId, input) : memory.upsertFcmToken(userId, input);

export const listFcmForUsers = (userIds: string[]) =>
  usePostgres() ? postgres.listFcmForUsers(userIds) : memory.listFcmForUsers(userIds);
