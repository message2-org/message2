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
  mediaId?: string;
  preview?: string;
  previewType?: "image" | "video" | "audio" | "file";
  fileName?: string;
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
};
