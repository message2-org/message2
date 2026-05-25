import type { PrismaClient } from "@prisma/client";
import {
  clampEncryptionMode,
  defaultInstanceEncryptionPolicy,
  isEncryptionDowngrade,
  isEncryptionMode,
  isValidInstancePolicyShape,
  resolveEffectiveEncryptionMode,
  type EncryptionMode,
  type InstanceEncryptionPolicy
} from "@message2/contracts";
import { instanceConfig } from "./instance-config.js";
import { broadcastToUsers } from "./realtime.js";

type InstanceSettingsRow = {
  defaultEncryptionMode: string;
  minEncryptionMode: string;
  maxEncryptionMode: string;
};

const rowToPolicy = (row: InstanceSettingsRow): InstanceEncryptionPolicy => ({
  defaultMode: row.defaultEncryptionMode as EncryptionMode,
  minMode: row.minEncryptionMode as EncryptionMode,
  maxMode: row.maxEncryptionMode as EncryptionMode
});

export const getChatKind = (memberCount: number): "dm" | "group" =>
  memberCount <= 2 ? "dm" : "group";

export const ensureInstanceEncryptionPolicy = async (prisma: PrismaClient): Promise<InstanceEncryptionPolicy> => {
  const existing = await prisma.instanceSettings.findUnique({ where: { id: "default" } });
  if (existing) return rowToPolicy(existing);

  const seed = defaultInstanceEncryptionPolicy(instanceConfig.deploymentProfile);
  const created = await prisma.instanceSettings.create({
    data: {
      id: "default",
      defaultEncryptionMode: seed.defaultMode,
      minEncryptionMode: seed.minMode,
      maxEncryptionMode: seed.maxMode
    }
  });
  return rowToPolicy(created);
};

export const validateInstancePolicyInput = (
  body: Record<string, unknown>
): { ok: true; value: InstanceEncryptionPolicy } | { ok: false; error: string } => {
  const defaultMode = typeof body.defaultMode === "string" ? body.defaultMode : "";
  const minMode = typeof body.minMode === "string" ? body.minMode : "";
  const maxMode = typeof body.maxMode === "string" ? body.maxMode : "";
  if (!isEncryptionMode(defaultMode) || !isEncryptionMode(minMode) || !isEncryptionMode(maxMode)) {
    return { ok: false, error: "invalid_encryption_mode" };
  }
  const policy = { defaultMode, minMode, maxMode };
  if (!isValidInstancePolicyShape(policy)) {
    return { ok: false, error: "invalid_policy_bounds" };
  }
  return { ok: true, value: policy };
};

export const updateInstanceEncryptionPolicy = async (
  prisma: PrismaClient,
  policy: InstanceEncryptionPolicy,
  updatedBy?: string
) => {
  const saved = await prisma.instanceSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      defaultEncryptionMode: policy.defaultMode,
      minEncryptionMode: policy.minMode,
      maxEncryptionMode: policy.maxMode,
      updatedBy
    },
    update: {
      defaultEncryptionMode: policy.defaultMode,
      minEncryptionMode: policy.minMode,
      maxEncryptionMode: policy.maxMode,
      updatedBy
    }
  });
  return rowToPolicy(saved);
};

export const getChatEncryptionState = async (
  prisma: PrismaClient,
  chatId: string,
  userId: string
) => {
  const policy = await ensureInstanceEncryptionPolicy(prisma);
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true }
  });
  if (!chat) return null;
  const isMember = chat.members.some((member) => member.userId === userId);
  if (!isMember) return null;

  const storedMode = chat.encryptionMode as EncryptionMode | null;
  const effectiveMode = resolveEffectiveEncryptionMode(storedMode, policy);
  const pendingRequest = await prisma.encryptionDowngradeRequest.findFirst({
    where: { chatId, status: "pending" }
  });

  return {
    chatId,
    kind: getChatKind(chat.members.length),
    storedMode,
    effectiveMode,
    policy,
    pendingRequest: pendingRequest
      ? {
          id: pendingRequest.id,
          requestedMode: pendingRequest.requestedMode as EncryptionMode,
          requestedByUserId: pendingRequest.requestedByUserId,
          peerUserId: pendingRequest.peerUserId,
          status: pendingRequest.status,
          isRequester: pendingRequest.requestedByUserId === userId,
          isPeer: pendingRequest.peerUserId === userId
        }
      : null
  };
};

export const requestChatEncryptionMode = async (
  prisma: PrismaClient,
  chatId: string,
  userId: string,
  requestedMode: EncryptionMode
) => {
  const policy = await ensureInstanceEncryptionPolicy(prisma);
  if (!isWithinEncryptionBounds(requestedMode, policy)) {
    return { ok: false as const, status: 403, error: "mode_out_of_policy_bounds" };
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true }
  });
  if (!chat) return { ok: false as const, status: 404, error: "chat_not_found" };
  if (!chat.members.some((member) => member.userId === userId)) {
    return { ok: false as const, status: 403, error: "not_a_member" };
  }

  const current = resolveEffectiveEncryptionMode(chat.encryptionMode as EncryptionMode | null, policy);
  const clamped = clampEncryptionMode(requestedMode, policy);
  if (current === clamped) {
    return { ok: true as const, status: 200, effectiveMode: current, pending: false };
  }

  const kind = getChatKind(chat.members.length);
  if (isEncryptionDowngrade(current, clamped) && kind === "dm") {
    const existingPending = await prisma.encryptionDowngradeRequest.findFirst({
      where: { chatId, status: "pending" }
    });
    if (existingPending) {
      return { ok: false as const, status: 409, error: "downgrade_already_pending" };
    }
    const peer = chat.members.find((member) => member.userId !== userId);
    if (!peer) {
      return { ok: false as const, status: 400, error: "dm_peer_missing" };
    }

    const request = await prisma.encryptionDowngradeRequest.create({
      data: {
        chatId,
        requestedMode: clamped,
        requestedByUserId: userId,
        peerUserId: peer.userId,
        status: "pending"
      }
    });

    broadcastToUsers([peer.userId], {
      type: "encryption.downgrade.request",
      payload: {
        chatId,
        requestId: request.id,
        requestedMode: clamped,
        currentMode: current,
        requestedByUserId: userId
      }
    });

    return {
      ok: true as const,
      status: 202,
      pending: true,
      requestId: request.id,
      effectiveMode: current,
      requestedMode: clamped
    };
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: { encryptionMode: clamped }
  });
  await prisma.encryptionDowngradeRequest.updateMany({
    where: { chatId, status: "pending" },
    data: { status: "superseded", resolvedAt: new Date() }
  });

  const memberIds = chat.members.map((member) => member.userId);
  broadcastToUsers(memberIds, {
    type: "encryption.mode.changed",
    payload: { chatId, effectiveMode: clamped, previousMode: current }
  });

  return { ok: true as const, status: 200, pending: false, effectiveMode: clamped };
};

export const respondToDowngradeRequest = async (
  prisma: PrismaClient,
  chatId: string,
  requestId: string,
  userId: string,
  accept: boolean
) => {
  const request = await prisma.encryptionDowngradeRequest.findFirst({
    where: { id: requestId, chatId, status: "pending" }
  });
  if (!request) return { ok: false as const, status: 404, error: "request_not_found" };
  if (request.peerUserId !== userId) {
    return { ok: false as const, status: 403, error: "not_downgrade_peer" };
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { members: true }
  });
  if (!chat) return { ok: false as const, status: 404, error: "chat_not_found" };

  if (!accept) {
    await prisma.encryptionDowngradeRequest.update({
      where: { id: requestId },
      data: { status: "rejected", peerConsentedAt: new Date(), resolvedAt: new Date() }
    });
    broadcastToUsers(chat.members.map((member) => member.userId), {
      type: "encryption.downgrade.rejected",
      payload: { chatId, requestId }
    });
    return { ok: true as const, status: 200, accepted: false };
  }

  const policy = await ensureInstanceEncryptionPolicy(prisma);
  const mode = clampEncryptionMode(request.requestedMode as EncryptionMode, policy);

  await prisma.$transaction([
    prisma.chat.update({ where: { id: chatId }, data: { encryptionMode: mode } }),
    prisma.encryptionDowngradeRequest.update({
      where: { id: requestId },
      data: { status: "approved", peerConsentedAt: new Date(), resolvedAt: new Date() }
    })
  ]);

  broadcastToUsers(chat.members.map((member) => member.userId), {
    type: "encryption.mode.changed",
    payload: { chatId, effectiveMode: mode, previousMode: request.requestedMode }
  });

  return { ok: true as const, status: 200, accepted: true, effectiveMode: mode };
};
