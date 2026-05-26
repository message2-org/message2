import type express from "express";
import type { PrismaClient } from "@prisma/client";
import type { MessageDisclosureMark } from "@message2/contracts";
import { broadcastToUsers } from "./realtime.js";
import { getChatMemberIds, messageInclude, rowToEnvelope } from "./message-envelope.js";
import { notifyMessagePush, previewTextFromCipher } from "./notify-push.js";

type AuthPayload = { sub: string; role: "user" | "admin" };
type AuthRequest = express.Request & { auth?: AuthPayload };

const EMOJI_RE = /^[\p{Extended_Pictographic}\u{FE0F}\u{200D}]{1,8}$/u;

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

type Deps = {
  prisma: PrismaClient;
  auth: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
  isChatMember: (chatId: string, userId: string) => Promise<boolean>;
};

export function registerMessageRoutes(app: express.Express, deps: Deps) {
  const { prisma, auth, isChatMember } = deps;

  app.get("/chats/:chatId/messages", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const viewerId = req.auth!.sub;
    if (!(await isChatMember(chatId, viewerId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const [rows, disclosures, tombstones] = await Promise.all([
      prisma.message.findMany({
        where: { chatId },
        orderBy: { sentAt: "asc" },
        include: messageInclude
      }),
      prisma.messageDisclosure.findMany({ where: { chatId } }),
      prisma.messageTombstone.findMany({ where: { chatId }, orderBy: { deletedAt: "asc" } })
    ]);

    const disclosureByMessage = new Map<string, MessageDisclosureMark>();
    for (const row of rows) {
      const latest = row.disclosures[row.disclosures.length - 1];
      if (latest) {
        disclosureByMessage.set(row.id, {
          eventId: latest.eventId,
          action: latest.action as MessageDisclosureMark["action"],
          disclosureLevel: latest.disclosureLevel as MessageDisclosureMark["disclosureLevel"]
        });
      }
    }
    for (const item of disclosures) {
      if (!disclosureByMessage.has(item.messageId)) {
        disclosureByMessage.set(item.messageId, {
          eventId: item.eventId,
          action: item.action as MessageDisclosureMark["action"],
          disclosureLevel: item.disclosureLevel as MessageDisclosureMark["disclosureLevel"]
        });
      }
    }

    const envelopes = rows.map((row) =>
      rowToEnvelope(row, viewerId, { disclosure: disclosureByMessage.get(row.id) })
    );

    for (const tomb of tombstones) {
      envelopes.push(
        rowToEnvelope(
          {
            id: tomb.messageId,
            chatId: tomb.chatId,
            senderId: tomb.senderId ?? "00000000-0000-0000-0000-000000000000",
            cipherText: "",
            sentAt: tomb.sentAt ?? tomb.deletedAt,
            kind: tomb.kind ?? "text",
            mediaId: null,
            editedAt: null,
            deletedAt: null,
            replyToMessageId: null
          },
          viewerId,
          {
            isTombstone: true,
            tombstoneLabel: tomb.label,
            disclosure: {
              eventId: tomb.eventId,
              action: "message_delete",
              disclosureLevel: "partial"
            }
          }
        )
      );
    }

    envelopes.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    res.json(envelopes);
  });

  app.post("/chats/:chatId/messages", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const senderId = req.auth!.sub;
    if (!(await isChatMember(chatId, senderId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const replyToMessageId =
      typeof req.body.replyToMessageId === "string" ? req.body.replyToMessageId.trim() : "";
    if (replyToMessageId) {
      const parent = await prisma.message.findFirst({
        where: { id: replyToMessageId, chatId, deletedAt: null }
      });
      if (!parent) {
        res.status(400).json({ error: "invalid_reply_target" });
        return;
      }
    }

    const row = await prisma.message.create({
      data: {
        chatId,
        senderId,
        cipherText: String(req.body.cipherText ?? ""),
        kind: String(req.body.kind ?? "text"),
        mediaId: typeof req.body.mediaId === "string" ? req.body.mediaId : null,
        ...(replyToMessageId ? { replyToMessageId } : {})
      },
      include: messageInclude
    });

    const envelope = rowToEnvelope(row, senderId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.created", payload: envelope });
    notifyMessagePush({
      recipientUserIds: members,
      excludeUserId: senderId,
      chatId,
      messageId: row.id,
      senderId,
      senderDisplayName: row.sender?.displayName,
      previewText: previewTextFromCipher(row.cipherText)
    });
    res.status(201).json(envelope);
  });

  app.patch("/chats/:chatId/messages/:messageId", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const existing = await prisma.message.findFirst({ where: { id: messageId, chatId } });
    if (!existing || existing.deletedAt) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }
    if (existing.senderId !== userId) {
      res.status(403).json({ error: "only_sender_can_edit" });
      return;
    }

    const cipherText = String(req.body.cipherText ?? "").trim();
    if (!cipherText) {
      res.status(400).json({ error: "cipher_text_required" });
      return;
    }

    const row = await prisma.message.update({
      where: { id: messageId },
      data: { cipherText, editedAt: new Date() },
      include: messageInclude
    });
    const envelope = rowToEnvelope(row, userId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.updated", payload: envelope });
    res.json(envelope);
  });

  app.delete("/chats/:chatId/messages/:messageId", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const existing = await prisma.message.findFirst({ where: { id: messageId, chatId } });
    if (!existing || existing.deletedAt) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }
    if (existing.senderId !== userId) {
      res.status(403).json({ error: "only_sender_can_delete" });
      return;
    }

    const row = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
      include: messageInclude
    });
    const envelope = rowToEnvelope(row, userId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.deleted", payload: envelope });
    res.json(envelope);
  });

  app.put("/chats/:chatId/messages/:messageId/reactions", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim() : "";
    if (!emoji || !EMOJI_RE.test(emoji)) {
      res.status(400).json({ error: "invalid_emoji" });
      return;
    }

    const existing = await prisma.message.findFirst({
      where: { id: messageId, chatId, deletedAt: null }
    });
    if (!existing) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }

    const prior = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } }
    });
    if (prior?.emoji === emoji) {
      await prisma.messageReaction.delete({
        where: { messageId_userId: { messageId, userId } }
      });
    } else {
      await prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, emoji },
        update: { emoji }
      });
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true }
    });
    const payload = { chatId, messageId, reactions };
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.reactions", payload });
    res.json(payload);
  });

  app.post("/chats/:chatId/read", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const readAt = new Date();
    await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: readAt }
    });

    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, {
      type: "chat.read",
      payload: { chatId, userId, readAt: readAt.toISOString() }
    });
    res.json({ ok: true, readAt: readAt.toISOString() });
  });

  app.post("/chats/:chatId/typing", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const typing = req.body?.typing !== false;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true }
    });
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(
      members.filter((id) => id !== userId),
      {
        type: "chat.typing",
        payload: {
          chatId,
          userId,
          displayName: user?.displayName ?? "",
          typing
        }
      }
    );
    res.json({ ok: true });
  });
}
