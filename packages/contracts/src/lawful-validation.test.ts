import test from "node:test";
import assert from "node:assert/strict";
import { validatePrivilegedOperationRequest } from "./lawful-validation.js";

const validScope = {
  chatIds: ["550e8400-e29b-41d4-a716-446655440000"],
  messageIds: ["6ba7b810-9dad-11d1-80b4-00c04fd43008"]
};

const validBody = {
  action: "message_read",
  legalRef: "2026-12345-court-moscow",
  reasonCode: "court_order",
  reasonText: "x".repeat(120),
  scope: validScope,
  actor: "lawful_api"
};

test("accepts valid privileged operation", () => {
  const result = validatePrivilegedOperationRequest(validBody, { deploymentProfile: "public" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.reasonCode, "court_order");
    assert.equal(result.value.disclosureLevel, "partial");
  }
});

test("rejects missing legalRef and short reasonText", () => {
  const result = validatePrivilegedOperationRequest(
    { ...validBody, legalRef: "", reasonText: "short" },
    { deploymentProfile: "public" }
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.field === "legalRef"));
    assert.ok(result.errors.some((e) => e.field === "reasonText"));
  }
});

test("rejects lawful_api on corporate profile", () => {
  const result = validatePrivilegedOperationRequest(validBody, { deploymentProfile: "corporate" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.field === "actor"));
  }
});

test("requires longer reasonText for other", () => {
  const result = validatePrivilegedOperationRequest(
    { ...validBody, reasonCode: "other", reasonText: "x".repeat(150) },
    { deploymentProfile: "public" }
  );
  assert.equal(result.ok, false);
});
