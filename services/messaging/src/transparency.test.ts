import test from "node:test";
import assert from "node:assert/strict";
import { applyTransparencyEvent, resolveAffectedUserIds } from "./transparency.js";

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

test("applyTransparencyEvent skips user notices on corporate profile", async () => {
  process.env.DEPLOYMENT_PROFILE = "corporate";
  process.env.LAWFUL_ACCESS_ENABLED = "false";

  let noticeWrites = 0;
  const prisma = {
    chatMember: {
      findMany: async () => [{ userId: "6ba7b811-9dad-11d1-80b4-00c04fd43008" }]
    },
    transparencyUserNotice: {
      createMany: async () => {
        noticeWrites += 1;
        return { count: 1 };
      }
    },
    messageTombstone: { upsert: async () => ({}) },
    messageDisclosure: { upsert: async () => ({}) },
    message: {
      findMany: async () => [],
      findUnique: async () => null,
      delete: async () => ({}),
      upsert: async () => ({})
    }
  } as unknown as Parameters<typeof applyTransparencyEvent>[0];

  await applyTransparencyEvent(prisma, {
    id: "evt-corporate-001",
    action: "message_read",
    scope: { chatIds: ["550e8400-e29b-41d4-a716-446655440000"] },
    reasonCode: "court_order",
    legalRef: "corp-legal-ref",
    disclosureLevel: "partial",
    privilegedOperationId: "op-001",
    createdAt: new Date().toISOString()
  });

  assert.equal(noticeWrites, 0);
  process.env.DEPLOYMENT_PROFILE = "public";
  process.env.LAWFUL_ACCESS_ENABLED = "true";
});
