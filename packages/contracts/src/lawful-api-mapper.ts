import type { PrivilegedScope } from "./lawful.js";

const normalizeIdList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
};

const normalizeScope = (raw: unknown): PrivilegedScope | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const body = raw as Record<string, unknown>;
  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
  const chatIds = normalizeIdList(body.chatIds) ?? (chatId ? [chatId] : undefined);
  return {
    userIds: normalizeIdList(body.userIds),
    chatIds,
    messageIds: normalizeIdList(body.messageIds),
    channelIds: normalizeIdList(body.channelIds)
  };
};

/** Maps external lawful API JSON (e.g. scope.chatId) to privileged operation body. */
export const lawfulApiBodyToOperation = (raw: Record<string, unknown>): Record<string, unknown> => {
  const scope = normalizeScope(raw.scope);
  return {
    action: raw.action,
    legalRef: raw.legalRef,
    reasonCode: raw.reasonCode,
    reasonText: raw.reasonText,
    scope,
    actor: "lawful_api",
    disclosureLevel: raw.disclosureLevel,
    userFacingSummary: raw.userFacingSummary
  };
};
