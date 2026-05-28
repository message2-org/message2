export type AuthMode = "login" | "register";

export type AuthUser = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
};

export type ChatGroup = "favorite" | "regular" | "archived";

export type ChatItem = {
  id: string;
  group: ChatGroup;
  kind?: "dm" | "group";
  /** DM peer user id (for presence). */
  peerUserId?: string;
  /** DM peer username (other user), for search by @handle */
  peerUsername?: string;
  name: string;
  status: "online" | "offline";
  lastMessage: string;
  lastSenderName?: string;
  lastSenderType?: "me" | "other";
  lastAt?: string;
  lastDelivery?: "sent" | "read" | null;
  unread: number;
};

export type MessageDisclosure = {
  eventId: string;
  action: string;
  disclosureLevel: "full" | "partial" | "sealed";
};

export type MessageReaction = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

export type MessageReplyPreview = {
  id: string;
  author: string;
  text: string;
  isDeleted?: boolean;
};

export type Message = {
  id: string;
  sender: "me" | "them";
  author: string;
  text: string;
  time: string;
  createdAt?: string;
  kind?: string;
  sticker?: {
    stickerId: string;
    assetUrl: string;
    label: string;
    animated?: boolean;
  };
  mediaId?: string;
  preview?: string;
  previewType?: "image" | "video" | "audio" | "file";
  fileName?: string;
  mediaE2ee?: {
    alg: "aes-256-gcm";
    keyB64: string;
    ivB64: string;
    mime: string;
    size: number;
  };
  disclosure?: MessageDisclosure;
  isTombstone?: boolean;
  tombstoneLabel?: string;
  isDeleted?: boolean;
  editedAt?: string;
  replyTo?: MessageReplyPreview;
  reactions?: MessageReaction[];
};

export type TransparencyBanner = {
  eventId: string;
  summary: string;
  action: string;
  createdAt: string;
};

export type ComplaintRecord = {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  status: string;
  outcomeSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export type TransparencyDetailResponse = {
  notice: {
    id: string;
    eventId: string;
    action: string;
    scope: Record<string, unknown>;
    disclosureLevel: string;
    summary: string | null;
    createdAt: string;
    readAt: string | null;
  };
  event: {
    eventId: string;
    action: string;
    scope: Record<string, unknown>;
    disclosureLevel: string;
    summary: string;
    createdAt: string;
  };
  complaint: ComplaintRecord | null;
};

export type PendingAttachment = {
  mediaId: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  localPreview: string;
  mime: string;
  size: number;
  mediaE2ee?: {
    alg: "aes-256-gcm";
    keyB64: string;
    ivB64: string;
    mime: string;
    size: number;
  };
};

export type StickerItem = {
  id: string;
  packId: string;
  code: string;
  label: string;
  render: "large" | "inline";
  assetUrl?: string;
  animated?: boolean;
  tags: string[];
  sortOrder: number;
};

export type StickerPack = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  visibility: "public" | "private" | "corporate";
  isSystem: boolean;
  stickers: StickerItem[];
};
