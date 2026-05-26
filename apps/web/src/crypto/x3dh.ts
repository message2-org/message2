import type {
  DeviceKeyMaterialV1,
  DevicePrekeyBundlePublishedV1,
  E2eeX3dhInitV1,
  E2eeX3dhResponseV1
} from "@message2/contracts";
import { exportPublicKeyRaw } from "./binary.js";
import { kdfX3dhSharedSecret } from "./kdf.js";
import { verifySignedPrekey } from "./keys.js";
import {
  deriveX25519SharedSecret,
  generateX25519KeyPair,
  importX25519Private,
  importX25519Public
} from "./subtle.js";

async function responderDhParts(local: DeviceKeyMaterialV1, init: E2eeX3dhInitV1): Promise<Uint8Array[]> {
  const ikB = await importX25519Private(local.identityKeyPrivate);
  const spkB = await importX25519Private(local.signedPrekeyPrivate);
  const ikA = await importX25519Public(init.identityKeyPublic);
  const eA = await importX25519Public(init.ephemeralKeyPublic);
  const dhParts = [
    await deriveX25519SharedSecret(spkB, ikA),
    await deriveX25519SharedSecret(ikB, eA),
    await deriveX25519SharedSecret(spkB, eA)
  ];
  if (init.usedOneTimePrekeyId !== null) {
    const opk = local.oneTimePrekeys.find((row) => row.id === init.usedOneTimePrekeyId);
    if (!opk) throw new Error("one_time_prekey_missing");
    const opkKey = await importX25519Private(opk.privateKey);
    dhParts.push(await deriveX25519SharedSecret(opkKey, eA));
  }
  return dhParts;
}

export const createX3dhInit = async (
  local: DeviceKeyMaterialV1,
  remote: DevicePrekeyBundlePublishedV1,
  recipientDeviceId: string
) => {
  const valid = await verifySignedPrekey(remote.signingKeyPublic, remote.signedPrekeyPublic, remote.signedPrekeySignature);
  if (!valid) throw new Error("invalid_signed_prekey");
  const ikA = await importX25519Private(local.identityKeyPrivate);
  const eA = await generateX25519KeyPair();
  const ikB = await importX25519Public(remote.identityKeyPublic);
  const spkB = await importX25519Public(remote.signedPrekeyPublic);
  const dhParts = [
    await deriveX25519SharedSecret(ikA, spkB),
    await deriveX25519SharedSecret(eA.privateKey, ikB),
    await deriveX25519SharedSecret(eA.privateKey, spkB)
  ];
  let usedOneTimePrekeyId: number | null = null;
  if (remote.oneTimePrekey) {
    const opkB = await importX25519Public(remote.oneTimePrekey.publicKey);
    dhParts.push(await deriveX25519SharedSecret(eA.privateKey, opkB));
    usedOneTimePrekeyId = remote.oneTimePrekey.id;
  }
  const sharedKey = await kdfX3dhSharedSecret(dhParts);
  const init: E2eeX3dhInitV1 = {
    t: "x3dh_init",
    v: 1,
    senderDeviceId: local.deviceId,
    recipientDeviceId,
    identityKeyPublic: local.identityKeyPublic,
    ephemeralKeyPublic: await exportPublicKeyRaw(eA.publicKey),
    usedSignedPrekeyId: remote.signedPrekeyId,
    usedOneTimePrekeyId
  };
  return { sharedKey, init };
};

export const acceptX3dhInit = async (local: DeviceKeyMaterialV1, init: E2eeX3dhInitV1): Promise<Uint8Array> => {
  return kdfX3dhSharedSecret(await responderDhParts(local, init));
};

export const createX3dhResponse = async (local: DeviceKeyMaterialV1, init: E2eeX3dhInitV1) => {
  const sharedKey = await acceptX3dhInit(local, init);
  const eB = await generateX25519KeyPair();
  const response: E2eeX3dhResponseV1 = {
    t: "x3dh_response",
    v: 1,
    senderDeviceId: local.deviceId,
    recipientDeviceId: init.senderDeviceId,
    identityKeyPublic: local.identityKeyPublic,
    ephemeralKeyPublic: await exportPublicKeyRaw(eB.publicKey)
  };
  return { sharedKey, response };
};

export function dmAssociatedData(chatId: string, senderDeviceId: string): Uint8Array {
  return new TextEncoder().encode(`message2/e2ee/v1/aad:${chatId}:${senderDeviceId}`);
}
