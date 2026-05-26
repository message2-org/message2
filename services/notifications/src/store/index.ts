import type { FcmRegisterInput, WebPushSubscriptionInput } from "@message2/contracts";
import { config } from "../config.js";
import * as memory from "./memory.js";

export const resetPushStoreForTests = () => {
  if (config.pushStore !== "memory") {
    throw new Error("resetPushStoreForTests requires PUSH_STORE=memory");
  }
  memory.resetPushStoreForTests();
};

const usePostgres = () => config.pushStore === "postgres";

export const upsertWebPushSubscription = async (
  userId: string,
  input: WebPushSubscriptionInput,
  userAgent?: string
) => {
  if (usePostgres()) {
    const postgres = await import("./postgres.js");
    return postgres.upsertWebPushSubscription(userId, input, userAgent);
  }
  return memory.upsertWebPushSubscription(userId, input, userAgent);
};

export const removeWebPushSubscription = async (userId: string, endpoint: string) => {
  if (usePostgres()) {
    const postgres = await import("./postgres.js");
    return postgres.removeWebPushSubscription(userId, endpoint);
  }
  return memory.removeWebPushSubscription(userId, endpoint);
};

export const listWebPushForUsers = async (userIds: string[]) => {
  if (usePostgres()) {
    const postgres = await import("./postgres.js");
    return postgres.listWebPushForUsers(userIds);
  }
  return memory.listWebPushForUsers(userIds);
};

export const upsertFcmToken = async (userId: string, input: FcmRegisterInput) => {
  if (usePostgres()) {
    const postgres = await import("./postgres.js");
    return postgres.upsertFcmToken(userId, input);
  }
  return memory.upsertFcmToken(userId, input);
};

export const listFcmForUsers = async (userIds: string[]) => {
  if (usePostgres()) {
    const postgres = await import("./postgres.js");
    return postgres.listFcmForUsers(userIds);
  }
  return memory.listFcmForUsers(userIds);
};
