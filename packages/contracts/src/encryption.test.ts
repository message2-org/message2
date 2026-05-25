import test from "node:test";
import assert from "node:assert/strict";
import {
  clampEncryptionMode,
  defaultInstanceEncryptionPolicy,
  isEncryptionDowngrade,
  isWithinEncryptionBounds,
  resolveEffectiveEncryptionMode
} from "./encryption.js";

test("encryption downgrade detection", () => {
  assert.equal(isEncryptionDowngrade("e2ee_strict", "server_encrypted"), true);
  assert.equal(isEncryptionDowngrade("server_encrypted", "e2ee_strict"), false);
});

test("instance bounds and effective mode", () => {
  const policy = defaultInstanceEncryptionPolicy("public");
  assert.equal(isWithinEncryptionBounds("metadata_only", policy), true);
  assert.equal(
    resolveEffectiveEncryptionMode("e2ee_strict", policy),
    "e2ee_strict"
  );
  assert.equal(
    resolveEffectiveEncryptionMode(null, policy),
    policy.defaultMode
  );
  assert.equal(
    clampEncryptionMode("metadata_only", { ...policy, minMode: "server_encrypted" }),
    "server_encrypted"
  );
});
