import type { PushMessageDispatch } from "@message2/contracts";
import { sendFcmToUsers } from "./fcm.js";
import { sendWebPushToUsers } from "./web-push.js";

export const dispatchMessagePush = async (input: PushMessageDispatch) => {
  const recipients = input.recipientUserIds.filter((id) => id !== input.excludeUserId);
  if (recipients.length === 0) {
    return { ok: true, recipients: 0, web: { attempted: 0, sent: 0, failed: 0 }, fcm: { attempted: 0, sent: 0, failed: 0 } };
  }

  const title = input.senderDisplayName?.trim() || "Message 2";
  const body = input.previewText.trim() || "New message";
  const payload = {
    title,
    body,
    data: {
      type: "message.created",
      chatId: input.chatId,
      messageId: input.messageId,
      senderId: input.senderId
    }
  };

  const [web, fcm] = await Promise.all([
    sendWebPushToUsers(recipients, payload),
    sendFcmToUsers(recipients, payload)
  ]);

  return { ok: true, recipients: recipients.length, web, fcm };
};
