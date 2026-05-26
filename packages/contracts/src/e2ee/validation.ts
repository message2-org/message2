import type { PublishDevicePrekeyBundleInputV1 } from "./keys.js";
export type E2eeValidationError = { field: string; message: string };
const DEVICE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const B64_RE = /^[A-Za-z0-9+/=_-]+$/;
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isBase64ish = (value: string, minLen = 16) => value.length >= minLen && B64_RE.test(value);
export const validateDeviceId = (deviceId: unknown): E2eeValidationError | null => {
  if (!isNonEmptyString(deviceId)) return { field: "deviceId", message: "deviceId is required" };
  if (!DEVICE_ID_RE.test(deviceId)) return { field: "deviceId", message: "deviceId has invalid format" };
  return null;
};
export const validatePublishDevicePrekeyBundleInput = (body: unknown): { ok: true; value: PublishDevicePrekeyBundleInputV1 } | { ok: false; errors: E2eeValidationError[] } => {
  const errors: E2eeValidationError[] = [];
  if (!body || typeof body !== "object") return { ok: false, errors: [{ field: "body", message: "body must be an object" }] };
  const raw = body as Record<string, unknown>;
  for (const key of ["identityKeyPublic", "signingKeyPublic", "signedPrekeyPublic", "signedPrekeySignature"] as const) {
    const val = raw[key];
    if (!isNonEmptyString(val) || !isBase64ish(val)) errors.push({ field: key, message: `${key} must be a base64-encoded public key` });
  }
  const signedPrekeyId = raw.signedPrekeyId;
  if (typeof signedPrekeyId !== "number" || !Number.isInteger(signedPrekeyId) || signedPrekeyId < 0) errors.push({ field: "signedPrekeyId", message: "signedPrekeyId must be a non-negative integer" });
  const oneTimePrekeys = raw.oneTimePrekeys;
  if (oneTimePrekeys !== undefined) {
    if (!Array.isArray(oneTimePrekeys)) errors.push({ field: "oneTimePrekeys", message: "oneTimePrekeys must be an array" });
    else for (let i = 0; i < oneTimePrekeys.length; i += 1) {
      const item = oneTimePrekeys[i];
      if (!item || typeof item !== "object") { errors.push({ field: `oneTimePrekeys[${i}]`, message: "must be an object" }); continue; }
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "number" || !Number.isInteger(row.id) || row.id < 0) errors.push({ field: `oneTimePrekeys[${i}].id`, message: "invalid id" });
      if (!isNonEmptyString(row.publicKey) || !isBase64ish(row.publicKey)) errors.push({ field: `oneTimePrekeys[${i}].publicKey`, message: "invalid publicKey" });
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { identityKeyPublic: raw.identityKeyPublic as string, signingKeyPublic: raw.signingKeyPublic as string, signedPrekeyId: signedPrekeyId as number, signedPrekeyPublic: raw.signedPrekeyPublic as string, signedPrekeySignature: raw.signedPrekeySignature as string, oneTimePrekeys: Array.isArray(oneTimePrekeys) ? (oneTimePrekeys as Array<{ id: number; publicKey: string }>) : undefined } };
};
