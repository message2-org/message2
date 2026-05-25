-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "encryption_mode" TEXT;

-- CreateTable
CREATE TABLE "instance_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_encryption_mode" TEXT NOT NULL,
    "min_encryption_mode" TEXT NOT NULL,
    "max_encryption_mode" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "instance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encryption_downgrade_requests" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "requested_mode" TEXT NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "peer_user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requester_consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peer_consented_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encryption_downgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "encryption_downgrade_requests_chat_id_status_idx" ON "encryption_downgrade_requests"("chat_id", "status");

-- AddForeignKey
ALTER TABLE "encryption_downgrade_requests" ADD CONSTRAINT "encryption_downgrade_requests_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
