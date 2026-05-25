export type PrivilegedAction =
  | "message_read"
  | "message_export"
  | "account_restrict"
  | "account_delete"
  | "chat_delete"
  | "channel_delete"
  | "message_delete"
  | "metadata_query";

export type DisclosureLevel = "full" | "partial" | "sealed";

export type PrivilegedActor = "lawful_api" | "internal_admin" | "break_glass_admin";

export type DeploymentProfile = "public" | "corporate";

export interface PrivilegedScope {
  userIds?: string[];
  chatIds?: string[];
  messageIds?: string[];
  channelIds?: string[];
}

/** @deprecated Use TransparencyEventV1 */
export interface TransparencyEvent {
  id: string;
  chatId: string;
  actor: string;
  reason: string;
  createdAt: string;
}

export interface MessageDisclosureMark {
  eventId: string;
  action: PrivilegedAction;
  disclosureLevel: DisclosureLevel;
}

export interface TransparencyNoticePayload {
  eventId: string;
  action: PrivilegedAction;
  scope: PrivilegedScope;
  disclosureLevel: DisclosureLevel;
  summary: string;
  privilegedOperationId: string;
  createdAt: string;
}

export interface TransparencyEventV1 {
  id: string;
  deploymentProfile: DeploymentProfile;
  action: PrivilegedAction;
  scope: PrivilegedScope;
  reasonCode: string;
  reasonText: string;
  legalRef: string;
  disclosureLevel: DisclosureLevel;
  userFacingSummary?: string;
  actor: PrivilegedActor;
  privilegedOperationId: string;
  createdAt: string;
}

export interface PrivilegedOperationRequest {
  action: PrivilegedAction;
  legalRef: string;
  reasonCode: string;
  reasonText: string;
  scope: PrivilegedScope;
  actor?: PrivilegedActor;
  disclosureLevel?: DisclosureLevel;
  userFacingSummary?: string;
}

export const PRIVILEGED_ACTIONS: readonly PrivilegedAction[] = [
  "message_read",
  "message_export",
  "account_restrict",
  "account_delete",
  "chat_delete",
  "channel_delete",
  "message_delete",
  "metadata_query"
] as const;

export const LAWFUL_REASON_CODES = {
  court_order: { labelRu: "Исполнение судебного акта", defaultDisclosure: "partial" as DisclosureLevel },
  criminal_investigation: { labelRu: "Уголовное преследование", defaultDisclosure: "sealed" as DisclosureLevel },
  counter_terrorism: { labelRu: "Противодействие терроризму", defaultDisclosure: "sealed" as DisclosureLevel },
  child_safety: { labelRu: "Защита несовершеннолетних", defaultDisclosure: "partial" as DisclosureLevel },
  spam_abuse_ori: { labelRu: "Нарушение правил платформы / ОРИ", defaultDisclosure: "full" as DisclosureLevel },
  account_compromise: { labelRu: "Компрометация учётной записи", defaultDisclosure: "full" as DisclosureLevel },
  other: { labelRu: "Иное", defaultDisclosure: "partial" as DisclosureLevel }
} as const;

export type LawfulReasonCode = keyof typeof LAWFUL_REASON_CODES;

export const MIN_REASON_TEXT_LENGTH = 120;
export const MIN_REASON_TEXT_LENGTH_OTHER = 200;
export const MIN_LEGAL_REF_LENGTH = 3;
