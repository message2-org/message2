import {
  isE2eeHandshakeCipherText,
  isE2eeDmCipherText,
  parseE2eeDmCipherText,
  type DevicePrekeyBundlePublishedV1
} from "@message2/contracts";
export { isE2eeHandshakeCipherText } from "@message2/contracts";
import type { DeviceKeyMaterialV1 } from "@message2/contracts";
import { toPublishBundleInput } from "../crypto/keys.js";
import { DmE2eeSession } from "../crypto/dm-session.js";
import { loadOrCreateDeviceKeyMaterial, readDmSession, saveDmSession } from "../crypto/store.js";
import { fetchPeerPrekeyBundle, listMyDevices, publishPrekeyBundle } from "./api.js";

const activeSessions = new Map<string, DmE2eeSession>();

export async function syncPrekeyBundle(token: string, deviceId: string): Promise<boolean> {
  const material = await loadOrCreateDeviceKeyMaterial(deviceId);
  const summary = await publishPrekeyBundle(token, deviceId, toPublishBundleInput(material));
  return summary !== null;
}

export function shouldUseDmE2ee(chatKind: "dm" | "group", encryptionMode: string | null | undefined): boolean {
  return chatKind === "dm" && encryptionMode === "e2ee_strict";
}

export function isDmE2eeActive(chatId: string): boolean {
  return activeSessions.has(chatId) || readDmSession(chatId) !== null;
}

export async function prepareOutgoingCipherTexts(options: {
  token: string;
  chatId: string;
  chatKind: "dm" | "group";
  encryptionMode: string | null | undefined;
  localDeviceId: string;
  peerUserId: string;
  peerDeviceId: string;
  plaintexts: string[];
}): Promise<string[] | null> {
  if (!shouldUseDmE2ee(options.chatKind, options.encryptionMode)) return null;
  let session = activeSessions.get(options.chatId);
  if (!session) {
    const local = await loadOrCreateDeviceKeyMaterial(options.localDeviceId);
    const remote = await fetchPeerPrekeyBundle(
      options.token,
      options.peerUserId,
      options.peerDeviceId || undefined,
      { requireDmPeer: true }
    );
    if (!remote) return null;
    const started = await DmE2eeSession.startInitiator({ chatId: options.chatId, local, remote });
    session = started.session;
    activeSessions.set(options.chatId, session);
    saveDmSession(options.chatId, {
      chatId: options.chatId,
      peerUserId: options.peerUserId,
      peerDeviceId: options.peerDeviceId,
      localDeviceId: options.localDeviceId,
      role: "initiator",
      rootKeyB64: ""
    });
    const out: string[] = [started.initWire];
    for (const text of options.plaintexts) out.push(await session.encrypt(text));
    return out;
  }
  const out: string[] = [];
  for (const text of options.plaintexts) out.push(await session.encrypt(text));
  return out;
}

export async function decodeIncomingCipherText(options: {
  chatId: string;
  cipherText: string;
  localMaterial: DeviceKeyMaterialV1;
}): Promise<string | null> {
  if (isE2eeHandshakeCipherText(options.cipherText)) {
    const { session } = await DmE2eeSession.startResponder({
      chatId: options.chatId,
      local: options.localMaterial,
      initWire: options.cipherText
    });
    activeSessions.set(options.chatId, session);
    return null;
  }
  if (!isE2eeDmCipherText(options.cipherText)) return null;
  const session = activeSessions.get(options.chatId);
  if (!session) return null;
  return session.decrypt(options.cipherText);
}

export async function ensureLocalDeviceRegistered(token: string, deviceId: string): Promise<DeviceKeyMaterialV1> {
  await loadOrCreateDeviceKeyMaterial(deviceId);
  await syncPrekeyBundle(token, deviceId);
  await listMyDevices(token);
  return loadOrCreateDeviceKeyMaterial(deviceId);
}

export function peekParsedPayload(cipherText: string) {
  return parseE2eeDmCipherText(cipherText);
}

export type { DevicePrekeyBundlePublishedV1 };
