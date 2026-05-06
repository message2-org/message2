import test from "node:test";
import assert from "node:assert/strict";

test("web smoke", () => {
  assert.equal("Послание2".length > 0, true);
});
