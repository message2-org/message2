export type MessageKind = "text" | "image" | "video" | "audio" | "file";

export interface EncryptedEnvelope {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: string;
  kind: MessageKind;
  mediaId?: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  replyToMessageId?: string;
  replyTo?: import("./message.js").MessageReplyPreview;
  reactions?: import("./message.js").MessageReactionSummary[];
}

export type { MessageReactionSummary, MessageReplyPreview, EncryptedEnvelopeV1 } from "./message.js";

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

export { lawfulApiBodyToOperation } from "./lawful-api-mapper.js";

export {
  COMPLAINT_STATUSES,
  MIN_COMPLAINT_BODY_LENGTH,
  type ComplaintCreateInput,
  type ComplaintRecord,
  type ComplaintStatus
} from "./complaint.js";

export {
  CORPORATE_CONNECTIVITY_MODES,
  isUserTransparencyEnabled,
  parseCorporateConnectivityMode,
  parseDeploymentProfile,
  readInstanceProfileFromEnv,
  resolveLawfulAccessEnabled,
  type CorporateConnectivityMode,
  type InstanceProfileSnapshot
} from "./deployment-profile.js";

export type { FcmRegisterInput, PushMessageDispatch, WebPushSubscriptionInput } from "./push.js";

export {
  ENCRYPTION_MODES,
  ENCRYPTION_MODE_STRENGTH,
  clampEncryptionMode,
  defaultInstanceEncryptionPolicy,
  encryptionModeStrength,
  isEncryptionDowngrade,
  isEncryptionMode,
  isWithinEncryptionBounds,
  resolveEffectiveEncryptionMode,
  isValidInstancePolicyShape,
  type EncryptionMode,
  type InstanceEncryptionPolicy
} from "./encryption.js";
