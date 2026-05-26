import test from "node:test";
import assert from "node:assert/strict";
import { E2EE_DM_CIPHER_PREFIX } from "./constants.js";
import { formatE2eeDmCipherText, isE2eeDmCipherText, isE2eeHandshakeCipherText, parseE2eeDmCipherText } from "./codec.js";
test("format and parse ratchet msg roundtrip", () => {
  const payload = { t: "msg" as const, v: 1 as const, senderDeviceId: "web-1", header: { n: 1, pn: 0, dhPublic: "abc123" }, ciphertext: "ct", nonce: "nonce" };
  const wire = formatE2eeDmCipherText(payload);
  assert.ok(wire.startsWith(E2EE_DM_CIPHER_PREFIX));
  assert.equal(isE2eeDmCipherText(wire), true);
  assert.deepEqual(parseE2eeDmCipherText(wire), payload);
});
test("handshake cipher detection", () => {
  const init = formatE2eeDmCipherText({ t: "x3dh_init", v: 1, senderDeviceId: "a", recipientDeviceId: "b", identityKeyPublic: "ik", ephemeralKeyPublic: "ek", usedSignedPrekeyId: 1, usedOneTimePrekeyId: 2 });
  assert.equal(isE2eeHandshakeCipherText(init), true);
});
