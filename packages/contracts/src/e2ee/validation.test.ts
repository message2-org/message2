import test from "node:test";
import assert from "node:assert/strict";
import { validateDeviceId, validatePublishDevicePrekeyBundleInput } from "./validation.js";
const validBundle = { identityKeyPublic: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=", signingKeyPublic: "QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=", signedPrekeyId: 1, signedPrekeyPublic: "Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQw==", signedPrekeySignature: "RERERERERERERERERERERERERERERERERERERERERERE=" };
test("validateDeviceId", () => { assert.equal(validateDeviceId("web-primary"), null); });
test("validatePublishDevicePrekeyBundleInput", () => { assert.equal(validatePublishDevicePrekeyBundleInput(validBundle).ok, true); });
