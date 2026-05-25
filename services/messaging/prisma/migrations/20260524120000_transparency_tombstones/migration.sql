-- Transparency (public profile): disclosures, tombstones, user notices

CREATE TABLE "MessageDisclosure" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "disclosureLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDisclosure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageTombstone" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "senderId" UUID,
    "kind" TEXT,
    "sentAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageTombstone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransparencyUserNotice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scopeJson" TEXT NOT NULL,
    "disclosureLevel" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "TransparencyUserNotice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageDisclosure_messageId_eventId_key" ON "MessageDisclosure"("messageId", "eventId");
CREATE INDEX "MessageDisclosure_chatId_idx" ON "MessageDisclosure"("chatId");

CREATE UNIQUE INDEX "MessageTombstone_messageId_eventId_key" ON "MessageTombstone"("messageId", "eventId");
CREATE INDEX "MessageTombstone_chatId_idx" ON "MessageTombstone"("chatId");

CREATE INDEX "TransparencyUserNotice_userId_createdAt_idx" ON "TransparencyUserNotice"("userId", "createdAt" DESC);

ALTER TABLE "MessageDisclosure" ADD CONSTRAINT "MessageDisclosure_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageDisclosure" ADD CONSTRAINT "MessageDisclosure_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageTombstone" ADD CONSTRAINT "MessageTombstone_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransparencyUserNotice" ADD CONSTRAINT "TransparencyUserNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
