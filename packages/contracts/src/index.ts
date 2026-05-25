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

export type { TransparencyEvent } from "./lawful.js";

export {
  LAWFUL_REASON_CODES,
  MIN_LEGAL_REF_LENGTH,
  MIN_REASON_TEXT_LENGTH,
  MIN_REASON_TEXT_LENGTH_OTHER,
  PRIVILEGED_ACTIONS,
  type DeploymentProfile,
  type DisclosureLevel,
  type LawfulReasonCode,
  type PrivilegedAction,
  type PrivilegedActor,
  type PrivilegedOperationRequest,
  type PrivilegedScope,
  type TransparencyEventV1,
  type MessageDisclosureMark,
  type TransparencyNoticePayload
} from "./lawful.js";

export {
  legacyReadBodyToOperation,
  parsePrivilegedScope,
  validatePrivilegedOperationRequest,
  type ValidationError,
  type ValidatePrivilegedOptions
} from "./lawful-validation.js";
