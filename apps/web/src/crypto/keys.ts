import type { DeviceKeyMaterialV1, PublishDevicePrekeyBundleInputV1 } from "@message2/contracts";
import { exportPrivateKeyPkcs8, exportPublicKeyRaw, fromBase64Url, toBase64Url, utf8Encode } from "./binary.js";
import {
  ed25519Sign,
  ed25519Verify,
  generateEd25519KeyPair,
  generateX25519KeyPair,
  importEd25519Public
} from "./subtle.js";

const randomDeviceSuffix = () =>
  crypto.getRandomValues(new Uint8Array(4)).reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "");

export async function generateDeviceKeyMaterial(deviceId = `web-${randomDeviceSuffix()}`): Promise<DeviceKeyMaterialV1> {
  const identity = await generateX25519KeyPair();
  const signing = await generateEd25519KeyPair();
  const signedPrekey = await generateX25519KeyPair();
  const signedPrekeyId = Math.floor(Date.now() / 1000) % 1_000_000;
  const signedPrekeyPublic = await exportPublicKeyRaw(signedPrekey.publicKey);
  const signature = await ed25519Sign(signing.privateKey, utf8Encode(signedPrekeyPublic));
  const oneTimePrekeys = await Promise.all(
    Array.from({ length: 5 }, async (_, index) => {
      const pair = await generateX25519KeyPair();
      return {
        id: signedPrekeyId + index + 1,
        publicKey: await exportPublicKeyRaw(pair.publicKey),
        privateKey: await exportPrivateKeyPkcs8(pair.privateKey)
      };
    })
  );
  return {
    deviceId,
    identityKeyPublic: await exportPublicKeyRaw(identity.publicKey),
    identityKeyPrivate: await exportPrivateKeyPkcs8(identity.privateKey),
    signingKeyPublic: await exportPublicKeyRaw(signing.publicKey),
    signingKeyPrivate: await exportPrivateKeyPkcs8(signing.privateKey),
    signedPrekeyId,
    signedPrekeyPublic,
    signedPrekeyPrivate: await exportPrivateKeyPkcs8(signedPrekey.privateKey),
    signedPrekeySignature: toBase64Url(signature),
    oneTimePrekeys
  };
}

export function toPublishBundleInput(material: DeviceKeyMaterialV1): PublishDevicePrekeyBundleInputV1 {
  return {
    identityKeyPublic: material.identityKeyPublic,
    signingKeyPublic: material.signingKeyPublic,
    signedPrekeyId: material.signedPrekeyId,
    signedPrekeyPublic: material.signedPrekeyPublic,
    signedPrekeySignature: material.signedPrekeySignature,
    oneTimePrekeys: material.oneTimePrekeys.map((opk) => ({ id: opk.id, publicKey: opk.publicKey }))
  };
}

export async function verifySignedPrekey(
  signingKeyPublicB64: string,
  signedPrekeyPublicB64: string,
  signatureB64: string
): Promise<boolean> {
  const pub = await importEd25519Public(signingKeyPublicB64);
  return ed25519Verify(pub, utf8Encode(signedPrekeyPublicB64), fromBase64Url(signatureB64));
}
