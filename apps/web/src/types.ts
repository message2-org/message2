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
};

export type PendingAttachment = {
  mediaId: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  localPreview: string;
};
