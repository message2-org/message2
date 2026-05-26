import { E2EE_DM_CIPHER_PREFIX } from "./constants.js";
import { isE2eeRatchetMsg, type E2eeRatchetMsgV1 } from "./ratchet.js";
import { isE2eeX3dhInit, isE2eeX3dhResponse, type E2eeHandshakePayloadV1 } from "./x3dh.js";
export type E2eeDmPayloadV1 = E2eeHandshakePayloadV1 | E2eeRatchetMsgV1;
const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const fromBase64Url = (encoded: string): Uint8Array => {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
};
export const formatE2eeDmCipherText = (payload: E2eeDmPayloadV1): string => {
  const json = JSON.stringify(payload);
  const encoded = typeof Buffer !== "undefined" ? Buffer.from(json, "utf8").toString("base64url") : toBase64Url(new TextEncoder().encode(json));
  return `${E2EE_DM_CIPHER_PREFIX}${encoded}`;
};
export const parseE2eeDmCipherText = (cipherText: string): E2eeDmPayloadV1 | null => {
  if (!cipherText.startsWith(E2EE_DM_CIPHER_PREFIX)) return null;
  const encoded = cipherText.slice(E2EE_DM_CIPHER_PREFIX.length);
  if (!encoded) return null;
  try {
    const json = typeof Buffer !== "undefined" ? Buffer.from(encoded, "base64url").toString("utf8") : new TextDecoder().decode(fromBase64Url(encoded));
    const parsed = JSON.parse(json) as E2eeDmPayloadV1;
    if (!parsed || typeof parsed !== "object" || (parsed as { v?: number }).v !== 1) return null;
    return parsed;
  } catch { return null; }
};
export const isE2eeDmCipherText = (cipherText: string): boolean => {
  const payload = parseE2eeDmCipherText(cipherText);
  return payload !== null && isE2eeRatchetMsg(payload);
};
export const isE2eeHandshakeCipherText = (cipherText: string): boolean => {
  const payload = parseE2eeDmCipherText(cipherText);
  if (!payload) return false;
  return isE2eeX3dhInit(payload) || isE2eeX3dhResponse(payload);
};
