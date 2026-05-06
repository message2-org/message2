export type MessageKind = "text" | "image" | "video" | "audio" | "file";

export interface EncryptedEnvelope {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: string;
  kind: MessageKind;
  mediaId?: string;
}

export interface TransparencyEvent {
  id: string;
  chatId: string;
  actor: string;
  reason: string;
  createdAt: string;
}
