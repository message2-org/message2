import type { DeviceKeyMaterialV1 } from "@message2/contracts";
import { generateDeviceKeyMaterial } from "./keys.js";

const DEVICE_STORAGE_KEY = "message2:e2ee:device";
const SESSION_STORAGE_KEY = "message2:e2ee:session";

export type StoredDmSessionV1 = {
  chatId: string;
  peerUserId: string;
  peerDeviceId: string;
  localDeviceId: string;
  role: "initiator" | "responder";
  rootKeyB64: string;
};

export async function loadOrCreateDeviceKeyMaterial(deviceId: string): Promise<DeviceKeyMaterialV1> {
  const existing = readDeviceKeyMaterial();
  if (existing && existing.deviceId === deviceId) return existing;
  const material = await generateDeviceKeyMaterial(deviceId);
  saveDeviceKeyMaterial(material);
  return material;
}

export function readDeviceKeyMaterial(): DeviceKeyMaterialV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeviceKeyMaterialV1;
  } catch {
    return null;
  }
}

export function saveDeviceKeyMaterial(material: DeviceKeyMaterialV1): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(material));
}

export function clearDeviceKeyMaterial(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(DEVICE_STORAGE_KEY);
}

export function readDmSession(chatId: string): StoredDmSessionV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, StoredDmSessionV1>;
    return map[chatId] ?? null;
  } catch {
    return null;
  }
}

export function saveDmSession(chatId: string, session: StoredDmSessionV1): void {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, StoredDmSessionV1>) : {};
  map[chatId] = session;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(map));
}

export function clearDmSession(chatId: string): void {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return;
  const map = JSON.parse(raw) as Record<string, StoredDmSessionV1>;
  delete map[chatId];
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(map));
}
