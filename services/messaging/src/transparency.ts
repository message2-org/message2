import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { DisclosureLevel, PrivilegedAction, PrivilegedScope, TransparencyEventV1 } from "@message2/contracts";
import { broadcastToUsers } from "./realtime.js";

export type TransparencyIngressPayload = Pick<
  TransparencyEventV1,
  | "id"
  | "action"
  | "scope"
  | "reasonCode"
  | "legalRef"
  | "disclosureLevel"
  | "userFacingSummary"
  | "privilegedOperationId"
  | "createdAt"
>;

const tombstoneLabel = (action: PrivilegedAction, locale: "ru" = "ru") => {
  if (locale === "en") {
    if (action === "message_delete") return "Message removed following an authorized request.";
    return "Message affected by a privileged access operation.";
  }
  if (action === "message_delete") return "Сообщение удалено по уполномоченному запросу.";
  return "Сообщение затронуто служебным доступом.";
};

const summaryForNotice = (payload: TransparencyIngressPayload) => {
  if (payload.userFacingSummary?.trim()) return payload.userFacingSummary.trim();
  if (payload.disclosureLevel === "sealed") {
    return "Служебный доступ по законному запросу. Подробности не раскрываются.";
  }
  return `Служебный доступ (${payload.action}). Основание: ${payload.reasonCode}.`;
};

export const resolveAffectedUserIds = async (prisma: PrismaClient, scope: PrivilegedScope): Promise<Set<string>> => {
  const userIds = new Set(scope.userIds ?? []);

  const chatIds = [...(scope.chatIds ?? []), ...(scope.channelIds ?? [])];

  for (const chatId of chatIds) {
    const members = await prisma.chatMember.findMany({ where: { chatId }, select: { userId: true } });
    for (const member of members) userIds.add(member.userId);
  }

  if (scope.messageIds?.length) {
    const messages = await prisma.message.findMany({
      where: { id: { in: scope.messageIds } },
      select: { id: true, chatId: true }
    });
    for (const message of messages) {
      const members = await prisma.chatMember.findMany({ where: { chatId: message.chatId }, select: { userId: true } });
      for (const member of members) userIds.add(member.userId);
    }
  }

  return userIds;
};

export const applyTransparencyEvent = async (prisma: PrismaClient, payload: TransparencyIngressPayload) => {
  const affectedUserIds = await resolveAffectedUserIds(prisma, payload.scope);
  const summary = summaryForNotice(payload);

  if (affectedUserIds.size) {
    await prisma.transparencyUserNotice.createMany({
      data: [...affectedUserIds].map((userId) => ({
        id: randomUUID(),
        userId,
        eventId: payload.id,
        action: payload.action,
        scopeJson: JSON.stringify(payload.scope),
        disclosureLevel: payload.disclosureLevel,
        summary
      }))
    });
  }

  const messageIds = payload.scope.messageIds ?? [];
  const disclosures: Array<{
    messageId: string;
    chatId: string;
    eventId: string;
    action: string;
    disclosureLevel: DisclosureLevel;
  }> = [];

  for (const messageId of messageIds) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) continue;

    if (payload.action === "message_delete") {
      await prisma.messageTombstone.upsert({
        where: { messageId_eventId: { messageId, eventId: payload.id } },
        create: {
          id: randomUUID(),
          messageId,
          chatId: message.chatId,
          eventId: payload.id,
          senderId: message.senderId,
          kind: message.kind,
          sentAt: message.sentAt,
          label: tombstoneLabel(payload.action)
        },
        update: {
          label: tombstoneLabel(payload.action),
          deletedAt: new Date()
        }
      });
      await prisma.message.delete({ where: { id: messageId } });
    } else {
      await prisma.messageDisclosure.upsert({
        where: { messageId_eventId: { messageId, eventId: payload.id } },
        create: {
          id: randomUUID(),
          messageId,
          chatId: message.chatId,
          eventId: payload.id,
          action: payload.action,
          disclosureLevel: payload.disclosureLevel
        },
        update: {
          action: payload.action,
          disclosureLevel: payload.disclosureLevel
        }
      });
      disclosures.push({
        messageId,
        chatId: message.chatId,
        eventId: payload.id,
        action: payload.action,
        disclosureLevel: payload.disclosureLevel
      });
    }
  }

  const noticePayload = {
    eventId: payload.id,
    action: payload.action,
    scope: payload.scope,
    disclosureLevel: payload.disclosureLevel,
    summary,
    privilegedOperationId: payload.privilegedOperationId,
    createdAt: payload.createdAt
  };

  broadcastToUsers(affectedUserIds, { type: "transparency.notice", payload: noticePayload });

  for (const disclosure of disclosures) {
    broadcastToUsers(affectedUserIds, {
      type: "message.disclosure",
      payload: {
        ...disclosure,
        privilegedOperationId: payload.privilegedOperationId
      }
    });
  }

  for (const messageId of messageIds) {
    if (payload.action !== "message_delete") continue;
    const tomb = await prisma.messageTombstone.findFirst({ where: { messageId, eventId: payload.id } });
    if (!tomb) continue;
    broadcastToUsers(affectedUserIds, {
      type: "message.tombstone",
      payload: {
        messageId: tomb.messageId,
        chatId: tomb.chatId,
        label: tomb.label,
        eventId: payload.id,
        deletedAt: tomb.deletedAt.toISOString()
      }
    });
  }

  return {
    affectedUserCount: affectedUserIds.size,
    disclosureCount: disclosures.length,
    deletedMessageCount: payload.action === "message_delete" ? messageIds.length : 0
  };
};
