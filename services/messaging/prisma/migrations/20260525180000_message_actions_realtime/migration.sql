-- Message actions (edit, soft-delete, reply, reactions) + read receipts
ALTER TABLE "Message" ADD COLUMN "edited_at" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deleted_by_user_id" UUID;
ALTER TABLE "Message" ADD COLUMN "reply_to_message_id" UUID;

ALTER TABLE "Message" ADD CONSTRAINT "Message_reply_to_message_id_fkey"
  FOREIGN KEY ("reply_to_message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Message_reply_to_message_id_idx" ON "Message"("reply_to_message_id");

ALTER TABLE "ChatMember" ADD COLUMN "last_read_at" TIMESTAMP(3);

CREATE TABLE "message_reactions" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("message_id","user_id"),
    CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");
