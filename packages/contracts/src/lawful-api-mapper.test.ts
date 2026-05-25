import test from "node:test";
import assert from "node:assert/strict";
import { lawfulApiBodyToOperation } from "./lawful-api-mapper.js";

test("lawfulApiBodyToOperation maps scope.chatId to chatIds", () => {
  const mapped = lawfulApiBodyToOperation({
    action: "message_delete",
    legalRef: "2026-12345-court",
    reasonCode: "court_order",
    reasonText: "x".repeat(120),
    scope: {
      chatId: "550e8400-e29b-41d4-a716-446655440000",
      messageIds: ["6ba7b810-9dad-11d1-80b4-00c04fd43008"]
    }
  }) as { actor: string; scope: { chatIds: string[]; messageIds: string[] } };

  assert.equal(mapped.actor, "lawful_api");
  assert.deepEqual(mapped.scope.chatIds, ["550e8400-e29b-41d4-a716-446655440000"]);
  assert.equal(mapped.scope.messageIds.length, 1);
});
