import type { PrismaClient } from "@prisma/client";
import type { EncryptedEnvelope, MessageDisclosureMark, MessageReactionSummary } from "@message2/contracts";

type MessageRow = {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: Date;
  kind: string;
  mediaId: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  replyToMessageId: string | null;
  sender?: { displayName: string };
  replyTo?: {
    id: string;
    senderId: string;
    cipherText: string;
    kind: string;
    deletedAt: Date | null;
    sender?: { displayName: string };
  } | null;
  reactions?: { emoji: string; userId: string }[];
};

export type EnvelopeExtras = {
  senderDisplayName?: string;
  disclosure?: MessageDisclosureMark;
  isTombstone?: boolean;
  tombstoneLabel?: string;
};

export function summarizeReactions(
  rows: { emoji: string; userId: string }[],
  viewerId?: string
): MessageReactionSummary[] {
  const byEmoji = new Map<string, { count: number; userIds: string[] }>();
  for (const row of rows) {
    const bucket = byEmoji.get(row.emoji) ?? { count: 0, userIds: [] };
    bucket.count += 1;
    bucket.userIds.push(row.userId);
    byEmoji.set(row.emoji, bucket);
  }
  return [...byEmoji.entries()].map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userIds: data.userIds,
    ...(viewerId && data.userIds.includes(viewerId) ? { reactedByMe: true } : {})
  }));
}

export function rowToEnvelope(row: MessageRow, viewerId?: string, extras?: EnvelopeExtras) {
  const isDeleted = Boolean(row.deletedAt);
  const envelope: EncryptedEnvelope & EnvelopeExtras = {
    id: row.id,
    chatId: row.chatId,
    senderId: row.senderId,
    cipherText: isDeleted ? "" : row.cipherText,
    sentAt: row.sentAt.toISOString(),
    kind: row.kind as EncryptedEnvelope["kind"],
    ...(row.mediaId ? { mediaId: row.mediaId } : {}),
    ...(row.editedAt ? { editedAt: row.editedAt.toISOString() } : {}),
    ...(row.deletedAt ? { deletedAt: row.deletedAt.toISOString(), isDeleted: true } : {}),
    ...(row.replyToMessageId ? { replyToMessageId: row.replyToMessageId } : {}),
    ...(row.replyTo
      ? {
          replyTo: {
            id: row.replyTo.id,
            senderId: row.replyTo.senderId,
            cipherText: row.replyTo.deletedAt ? "" : row.replyTo.cipherText,
            kind: row.replyTo.kind as EncryptedEnvelope["kind"],
            senderDisplayName: row.replyTo.sender?.displayName,
            ...(row.replyTo.deletedAt ? { isDeleted: true } : {})
          }
        }
      : {}),
    ...(row.reactions?.length ? { reactions: summarizeReactions(row.reactions, viewerId) } : {}),
    ...extras
  };
  if (row.sender?.displayName) envelope.senderDisplayName = row.sender.displayName;
  return envelope;
}

export const messageInclude = {
  sender: { select: { displayName: true } },
  disclosures: true,
  reactions: { select: { emoji: true, userId: true } },
  replyTo: {
    select: {
      id: true,
      senderId: true,
      cipherText: true,
      kind: true,
      deletedAt: true,
      sender: { select: { displayName: true } }
    }
  }
} as const;

export async function getChatMemberIds(prisma: PrismaClient, chatId: string) {
  const members = await prisma.chatMember.findMany({
    where: { chatId },
    select: { userId: true }
  });
  return members.map((m) => m.userId);
}
