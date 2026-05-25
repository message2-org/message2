export type PushMessageDispatch = {
  recipientUserIds: string[];
  excludeUserId?: string;
  chatId: string;
  messageId: string;
  senderId: string;
  senderDisplayName?: string;
  previewText: string;
};

export type WebPushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type FcmRegisterInput = {
  token: string;
  platform?: "android" | "ios" | "web";
};
