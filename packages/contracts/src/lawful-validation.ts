import {
  LAWFUL_REASON_CODES,
  MIN_LEGAL_REF_LENGTH,
  MIN_REASON_TEXT_LENGTH,
  MIN_REASON_TEXT_LENGTH_OTHER,
  PRIVILEGED_ACTIONS,
  type DeploymentProfile,
  type DisclosureLevel,
  type LawfulReasonCode,
  type PrivilegedActor,
  type PrivilegedOperationRequest,
  type PrivilegedScope
} from "./lawful.js";

export type ValidationError = { field: string; message: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeIdList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
};

export const parsePrivilegedScope = (raw: unknown): { scope?: PrivilegedScope; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== "object") {
    errors.push({ field: "scope", message: "scope object is required" });
    return { errors };
  }
  const body = raw as Record<string, unknown>;
  const scope: PrivilegedScope = {
    userIds: normalizeIdList(body.userIds),
    chatIds: normalizeIdList(body.chatIds),
    messageIds: normalizeIdList(body.messageIds),
    channelIds: normalizeIdList(body.channelIds)
  };
  const hasScope =
    Boolean(scope.userIds?.length) ||
    Boolean(scope.chatIds?.length) ||
    Boolean(scope.messageIds?.length) ||
    Boolean(scope.channelIds?.length);
  if (!hasScope) {
    errors.push({ field: "scope", message: "at least one of userIds, chatIds, messageIds, channelIds is required" });
  }
  for (const [field, ids] of Object.entries(scope) as [keyof PrivilegedScope, string[] | undefined][]) {
    if (!ids) continue;
    for (const id of ids) {
      if (!isUuidLike(id)) {
        errors.push({ field: `scope.${field}`, message: `invalid id: ${id}` });
      }
    }
  }
  return { scope, errors };
};

export type ValidatePrivilegedOptions = {
  deploymentProfile?: DeploymentProfile;
  lawfulAccessEnabled?: boolean;
};

export const validatePrivilegedOperationRequest = (
  raw: unknown,
  options: ValidatePrivilegedOptions = {}
): { ok: true; value: PrivilegedOperationRequest } | { ok: false; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];
  const deploymentProfile = options.deploymentProfile ?? "public";
  const lawfulAccessEnabled = options.lawfulAccessEnabled ?? deploymentProfile === "public";

  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: [{ field: "body", message: "request body must be an object" }] };
  }

  const body = raw as Record<string, unknown>;
  const action = body.action;
  if (!isNonEmptyString(action) || !PRIVILEGED_ACTIONS.includes(action as (typeof PRIVILEGED_ACTIONS)[number])) {
    errors.push({ field: "action", message: "valid action is required" });
  }

  const legalRef = isNonEmptyString(body.legalRef) ? body.legalRef.trim() : "";
  if (legalRef.length < MIN_LEGAL_REF_LENGTH) {
    errors.push({ field: "legalRef", message: `legalRef must be at least ${MIN_LEGAL_REF_LENGTH} characters` });
  }

  const reasonCodeRaw = isNonEmptyString(body.reasonCode) ? body.reasonCode.trim() : "";
  const reasonCode = reasonCodeRaw in LAWFUL_REASON_CODES ? (reasonCodeRaw as LawfulReasonCode) : null;
  if (!reasonCode) {
    errors.push({ field: "reasonCode", message: "unknown or missing reasonCode" });
  }

  const reasonText = isNonEmptyString(body.reasonText) ? body.reasonText.trim() : "";
  const minReasonLen = reasonCode === "other" ? MIN_REASON_TEXT_LENGTH_OTHER : MIN_REASON_TEXT_LENGTH;
  if (reasonText.length < minReasonLen) {
    errors.push({
      field: "reasonText",
      message: `reasonText must be at least ${minReasonLen} characters`
    });
  }

  const { scope, errors: scopeErrors } = parsePrivilegedScope(body.scope);
  errors.push(...scopeErrors);

  const actor = (isNonEmptyString(body.actor) ? body.actor.trim() : "internal_admin") as PrivilegedActor;
  const allowedActors: PrivilegedActor[] = ["lawful_api", "internal_admin", "break_glass_admin"];
  if (!allowedActors.includes(actor)) {
    errors.push({ field: "actor", message: "invalid actor" });
  }

  if (deploymentProfile === "corporate" && actor === "lawful_api") {
    errors.push({ field: "actor", message: "lawful_api is not allowed on corporate profile" });
  }
  if (!lawfulAccessEnabled && actor === "lawful_api") {
    errors.push({ field: "actor", message: "lawful access API is disabled on this instance" });
  }

  let disclosureLevel = body.disclosureLevel as DisclosureLevel | undefined;
  if (disclosureLevel && !["full", "partial", "sealed"].includes(disclosureLevel)) {
    errors.push({ field: "disclosureLevel", message: "invalid disclosureLevel" });
    disclosureLevel = undefined;
  }
  if (!disclosureLevel && reasonCode) {
    disclosureLevel = LAWFUL_REASON_CODES[reasonCode].defaultDisclosure;
  }

  const userFacingSummary = isNonEmptyString(body.userFacingSummary) ? body.userFacingSummary.trim() : undefined;

  if (errors.length || !action || !scope || !reasonCode) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      action: action as PrivilegedOperationRequest["action"],
      legalRef,
      reasonCode,
      reasonText,
      scope,
      actor,
      disclosureLevel: disclosureLevel ?? "partial",
      userFacingSummary
    }
  };
};

/** Legacy single-chatId body used by POST /privileged/read */
export const legacyReadBodyToOperation = (body: Record<string, unknown>): Record<string, unknown> => {
  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
  const messageIds = normalizeIdList(body.messageIds);
  return {
    action: "message_read",
    legalRef: body.legalRef ?? body.legal_ref ?? "",
    reasonCode: body.reasonCode ?? body.reason_code ?? "other",
    reasonText: body.reasonText ?? body.reason ?? "",
    scope: {
      chatIds: chatId ? [chatId] : undefined,
      messageIds
    },
    actor: body.actor,
    disclosureLevel: body.disclosureLevel,
    userFacingSummary: body.userFacingSummary
  };
};
