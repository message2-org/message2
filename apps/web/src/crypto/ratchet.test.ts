import assert from "node:assert/strict";
import test from "node:test";
import { isE2eeDmCipherText, isE2eeRatchetMsg, parseE2eeDmCipherText } from "@message2/contracts";
import type { DevicePrekeyBundlePublishedV1 } from "@message2/contracts";
import { DmE2eeSession } from "./dm-session.js";
import { generateDeviceKeyMaterial } from "./keys.js";

function toRemoteBundle(material: Awaited<ReturnType<typeof generateDeviceKeyMaterial>>, userId: string): DevicePrekeyBundlePublishedV1 {
  return {
    userId,
    deviceId: material.deviceId,
    identityKeyPublic: material.identityKeyPublic,
    signingKeyPublic: material.signingKeyPublic,
    signedPrekeyId: material.signedPrekeyId,
    signedPrekeyPublic: material.signedPrekeyPublic,
    signedPrekeySignature: material.signedPrekeySignature,
    oneTimePrekey: material.oneTimePrekeys[0]
      ? { id: material.oneTimePrekeys[0].id, publicKey: material.oneTimePrekeys[0].publicKey }
      : null
  };
}

test("DM ratchet bidirectional alice/bob", async () => {
  const aliceMaterial = await generateDeviceKeyMaterial("alice-web");
  const bobMaterial = await generateDeviceKeyMaterial("bob-web");
  const bobBundle = toRemoteBundle(bobMaterial, "user-bob");
  const { session: alice, initWire } = await DmE2eeSession.startInitiator({
    chatId: "chat-dm-1",
    local: aliceMaterial,
    remote: bobBundle
  });
  const { session: bob } = await DmE2eeSession.startResponder({
    chatId: "chat-dm-1",
    local: bobMaterial,
    initWire
  });
  const c1 = await alice.encrypt("hello bob");
  assert.ok(isE2eeDmCipherText(c1));
  assert.equal(await bob.decrypt(c1), "hello bob");
  const c2 = await bob.encrypt("hello alice");
  assert.equal(await alice.decrypt(c2), "hello alice");
  const c3 = await alice.encrypt("second from alice");
  assert.equal(await bob.decrypt(c3), "second from alice");
});

test("E2EE cipherText payload parses via contracts codec", async () => {
  const aliceMaterial = await generateDeviceKeyMaterial("a");
  const bobMaterial = await generateDeviceKeyMaterial("b");
  const { session, initWire } = await DmE2eeSession.startInitiator({
    chatId: "c",
    local: aliceMaterial,
    remote: toRemoteBundle(bobMaterial, "u")
  });
  await DmE2eeSession.startResponder({ chatId: "c", local: bobMaterial, initWire });
  const wire = await session.encrypt("ping");
  const payload = parseE2eeDmCipherText(wire);
  assert.ok(payload);
  assert.equal(isE2eeRatchetMsg(payload), true);
});
