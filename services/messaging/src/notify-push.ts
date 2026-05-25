import type { PushMessageDispatch } from "@message2/contracts";

const notificationsUrl = process.env.NOTIFICATIONS_URL ?? "http://localhost:4003";
const internalServiceSecret = process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal";

export function previewTextFromCipher(cipherText: string): string {
  const trimmed = cipherText.trim();
  if (!trimmed) return "New message";
  try {
    const parsed = JSON.parse(trimmed) as {
      kind?: string;
      text?: string;
      fileName?: string;
      previewType?: string;
    };
    if (parsed.kind === "attachment") {
      if (typeof parsed.text === "string" && parsed.text.trim()) return parsed.text.trim().slice(0, 160);
      if (typeof parsed.fileName === "string" && parsed.fileName.trim()) return parsed.fileName.trim();
      return "Attachment";
    }
  } catch {
    // plain text
  }
  return trimmed.slice(0, 160);
}

export const notifyMessagePush = (payload: PushMessageDispatch) => {
  void fetch(`${notificationsUrl}/internal/push/message`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": internalServiceSecret
    },
    body: JSON.stringify(payload)
  }).catch((error) => {
    console.warn("[messaging] push notify failed", error);
  });
};
