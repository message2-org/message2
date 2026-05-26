import test from "node:test";
import assert from "node:assert/strict";
import { usersShareDmChat } from "./e2ee-prekeys.js";

test("usersShareDmChat detects 2-member shared chat", async () => {
  const prisma = {
    chat: {
      findMany: async () => [
        {
          members: [
            { userId: "6ba7b811-9dad-11d1-80b4-00c04fd43008" },
            { userId: "6ba7b812-9dad-11d1-80b4-00c04fd43009" }
          ]
        },
        {
          members: [
            { userId: "6ba7b811-9dad-11d1-80b4-00c04fd43008" },
            { userId: "6ba7b813-9dad-11d1-80b4-00c04fd4300a" },
            { userId: "6ba7b814-9dad-11d1-80b4-00c04fd4300b" }
          ]
        }
      ]
    }
  } as unknown as Parameters<typeof usersShareDmChat>[0];

  assert.equal(
    await usersShareDmChat(prisma, "6ba7b811-9dad-11d1-80b4-00c04fd43008", "6ba7b812-9dad-11d1-80b4-00c04fd43009"),
    true
  );
  assert.equal(
    await usersShareDmChat(prisma, "6ba7b811-9dad-11d1-80b4-00c04fd43008", "6ba7b814-9dad-11d1-80b4-00c04fd4300b"),
    false
  );
});

test("usersShareDmChat returns false for same user", async () => {
  const prisma = { chat: { findMany: async () => [] } } as unknown as Parameters<typeof usersShareDmChat>[0];
  assert.equal(await usersShareDmChat(prisma, "u1", "u1"), false);
});
