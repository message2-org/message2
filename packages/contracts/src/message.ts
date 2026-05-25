import type { MessageKind } from "./index.js";

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe?: boolean;
};

export type MessageReplyPreview = {
  id: string;
  senderId: string;
  cipherText: string;
  kind: MessageKind;
  senderDisplayName?: string;
  isDeleted?: boolean;
};

export interface EncryptedEnvelopeV1 {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: string;
  kind: MessageKind;
  mediaId?: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  replyToMessageId?: string;
  replyTo?: MessageReplyPreview;
  reactions?: MessageReactionSummary[];
}
