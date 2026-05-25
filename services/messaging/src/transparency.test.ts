import test from "node:test";
import assert from "node:assert/strict";
import { resolveAffectedUserIds } from "./transparency.js";

test("resolveAffectedUserIds merges chat members and explicit user ids", async () => {
  const prisma = {
    chatMember: {
      findMany: async ({ where }: { where: { chatId?: string } }) => {
        if (where.chatId === "550e8400-e29b-41d4-a716-446655440000") {
          return [{ userId: "6ba7b811-9dad-11d1-80b4-00c04fd43008" }, { userId: "6ba7b812-9dad-11d1-80b4-00c04fd43009" }];
        }
        return [];
      }
    },
    message: {
      findMany: async () => []
    }
  } as unknown as Parameters<typeof resolveAffectedUserIds>[0];

  const ids = await resolveAffectedUserIds(prisma, {
    chatIds: ["550e8400-e29b-41d4-a716-446655440000"],
    userIds: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
  });

  assert.equal(ids.size, 3);
  assert.ok(ids.has("6ba7b810-9dad-11d1-80b4-00c04fd430c8"));
});
