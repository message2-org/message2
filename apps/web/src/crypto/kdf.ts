import {
  E2EE_LABEL_DR_CHAIN,
  E2EE_LABEL_DR_MESSAGE,
  E2EE_LABEL_DR_ROOT,
  E2EE_LABEL_X3DH_SHARED
} from "@message2/contracts";
import { concatBytes, utf8Encode } from "./binary.js";
import { hkdfSha256 } from "./subtle.js";

const EMPTY_SALT = new Uint8Array(0);

export async function kdfX3dhSharedSecret(dhOutputs: Uint8Array[]): Promise<Uint8Array> {
  const ikm = concatBytes(...dhOutputs);
  return hkdfSha256(ikm, EMPTY_SALT, utf8Encode(E2EE_LABEL_X3DH_SHARED), 32);
}

export async function kdfRootKey(rootKey: Uint8Array, dhOutput: Uint8Array) {
  const ikm = concatBytes(rootKey, dhOutput);
  const out = await hkdfSha256(ikm, EMPTY_SALT, utf8Encode(E2EE_LABEL_DR_ROOT), 64);
  return { rootKey: out.slice(0, 32), chainKey: out.slice(32, 64) };
}

export async function kdfChainKey(chainKey: Uint8Array) {
  const out = await hkdfSha256(chainKey, EMPTY_SALT, utf8Encode(E2EE_LABEL_DR_CHAIN), 64);
  return { chainKey: out.slice(0, 32), messageKey: out.slice(32, 64) };
}

export async function kdfInitialRoot(sharedSecret: Uint8Array): Promise<Uint8Array> {
  return hkdfSha256(sharedSecret, EMPTY_SALT, utf8Encode(E2EE_LABEL_DR_ROOT), 32);
}

export async function kdfMessageKeyMaterial(messageKey: Uint8Array): Promise<Uint8Array> {
  return hkdfSha256(messageKey, EMPTY_SALT, utf8Encode(E2EE_LABEL_DR_MESSAGE), 32);
}
