import type { PrismaClient } from "@prisma/client";
import type {
  DevicePrekeyBundlePublishedV1,
  DevicePrekeyBundleSummaryV1,
  PublishDevicePrekeyBundleInputV1
} from "@message2/contracts";

export const usersShareDmChat = async (
  prisma: PrismaClient,
  userA: string,
  userB: string
): Promise<boolean> => {
  if (userA === userB) return false;
  const chats = await prisma.chat.findMany({
    where: {
      AND: [
        { members: { some: { userId: userA } } },
        { members: { some: { userId: userB } } }
      ]
    },
    include: { members: true },
    take: 20
  });
  return chats.some(
    (chat) =>
      chat.members.length === 2 &&
      chat.members.some((m) => m.userId === userA) &&
      chat.members.some((m) => m.userId === userB)
  );
};

export const publishDevicePrekeyBundle = async (
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  input: PublishDevicePrekeyBundleInputV1
): Promise<DevicePrekeyBundleSummaryV1> => {
  const device = await prisma.userDevice.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    create: {
      userId,
      deviceId,
      identityKeyPublic: input.identityKeyPublic,
      signingKeyPublic: input.signingKeyPublic,
      signedPrekeyId: input.signedPrekeyId,
      signedPrekeyPublic: input.signedPrekeyPublic,
      signedPrekeySignature: input.signedPrekeySignature
    },
    update: {
      identityKeyPublic: input.identityKeyPublic,
      signingKeyPublic: input.signingKeyPublic,
      signedPrekeyId: input.signedPrekeyId,
      signedPrekeyPublic: input.signedPrekeyPublic,
      signedPrekeySignature: input.signedPrekeySignature
    }
  });

  if (input.oneTimePrekeys?.length) {
    await prisma.deviceOneTimePrekey.createMany({
      data: input.oneTimePrekeys.map((opk) => ({
        deviceRowId: device.id,
        prekeyId: opk.id,
        publicKey: opk.publicKey
      })),
      skipDuplicates: true
    });
  }

  const oneTimePrekeyCount = await prisma.deviceOneTimePrekey.count({
    where: { deviceRowId: device.id, consumedAt: null }
  });

  return {
    deviceId,
    signedPrekeyId: device.signedPrekeyId,
    oneTimePrekeyCount,
    updatedAt: device.updatedAt.toISOString()
  };
};

export const listMyDeviceBundles = async (
  prisma: PrismaClient,
  userId: string
): Promise<DevicePrekeyBundleSummaryV1[]> => {
  const devices = await prisma.userDevice.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }
  });
  const summaries: DevicePrekeyBundleSummaryV1[] = [];
  for (const device of devices) {
    const oneTimePrekeyCount = await prisma.deviceOneTimePrekey.count({
      where: { deviceRowId: device.id, consumedAt: null }
    });
    summaries.push({
      deviceId: device.deviceId,
      signedPrekeyId: device.signedPrekeyId,
      oneTimePrekeyCount,
      updatedAt: device.updatedAt.toISOString()
    });
  }
  return summaries;
};

export const fetchUserPrekeyBundle = async (
  prisma: PrismaClient,
  requesterId: string,
  targetUserId: string,
  deviceId: string | undefined,
  options: { requireDmPeer: boolean }
): Promise<
  | { ok: true; bundle: DevicePrekeyBundlePublishedV1 }
  | { ok: false; error: "device_not_found" | "dm_peer_required" }
> => {
  if (options.requireDmPeer) {
    const shared = await usersShareDmChat(prisma, requesterId, targetUserId);
    if (!shared) return { ok: false, error: "dm_peer_required" };
  }

  const device = deviceId
    ? await prisma.userDevice.findUnique({
        where: { userId_deviceId: { userId: targetUserId, deviceId } }
      })
    : await prisma.userDevice.findFirst({
        where: { userId: targetUserId },
        orderBy: { updatedAt: "desc" }
      });
  if (!device) return { ok: false, error: "device_not_found" };

  const opk = await prisma.deviceOneTimePrekey.findFirst({
    where: { deviceRowId: device.id, consumedAt: null },
    orderBy: { createdAt: "asc" }
  });

  if (opk) {
    await prisma.deviceOneTimePrekey.update({
      where: { id: opk.id },
      data: { consumedAt: new Date() }
    });
  }

  return {
    ok: true,
    bundle: {
      userId: targetUserId,
      deviceId: device.deviceId,
      identityKeyPublic: device.identityKeyPublic,
      signingKeyPublic: device.signingKeyPublic,
      signedPrekeyId: device.signedPrekeyId,
      signedPrekeyPublic: device.signedPrekeyPublic,
      signedPrekeySignature: device.signedPrekeySignature,
      oneTimePrekey: opk ? { id: opk.prekeyId, publicKey: opk.publicKey } : null
    }
  };
};
