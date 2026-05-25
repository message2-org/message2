import test from "node:test";
import assert from "node:assert/strict";
import { getChatKind } from "./encryption-policy.js";

test("getChatKind", () => {
  assert.equal(getChatKind(2), "dm");
  assert.equal(getChatKind(3), "group");
});
