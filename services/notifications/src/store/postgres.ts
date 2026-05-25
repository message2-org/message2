import { PrismaClient } from "@prisma/client";
import type { FcmRegisterInput, WebPushSubscriptionInput } from "@message2/contracts";

const prisma = new PrismaClient();

export const upsertWebPushSubscription = async (
  userId: string,
  input: WebPushSubscriptionInput,
  userAgent?: string
) => {
  await prisma.webPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent
    },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent
    }
  });
};

export const removeWebPushSubscription = async (userId: string, endpoint: string) => {
  const deleted = await prisma.webPushSubscription.deleteMany({
    where: { userId, endpoint }
  });
  return deleted.count > 0;
};

export const listWebPushForUsers = async (userIds: string[]) => {
  if (userIds.length === 0) return [];
  return prisma.webPushSubscription.findMany({ where: { userId: { in: userIds } } });
};

export const upsertFcmToken = async (userId: string, input: FcmRegisterInput) => {
  await prisma.fcmDeviceToken.upsert({
    where: { token: input.token },
    create: {
      userId,
      token: input.token,
      platform: input.platform ?? "android"
    },
    update: {
      userId,
      platform: input.platform ?? "android"
    }
  });
};

export const listFcmForUsers = async (userIds: string[]) => {
  if (userIds.length === 0) return [];
  return prisma.fcmDeviceToken.findMany({ where: { userId: { in: userIds } } });
};
