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

export type StickerRenderMode = "large" | "inline";

export type StickerPackDto = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  visibility: "public" | "private" | "corporate";
  isSystem: boolean;
  stickers: StickerDto[];
};

export type StickerDto = {
  id: string;
  packId: string;
  code: string;
  label: string;
  render: StickerRenderMode;
  assetUrl?: string;
  animated?: boolean;
  tags: string[];
  sortOrder: number;
};

export type StickerMessagePayloadV1 = {
  v: 1;
  kind: "sticker";
  stickerId: string;
  packId: string;
  label: string;
  assetUrl: string;
  animated?: boolean;
};
