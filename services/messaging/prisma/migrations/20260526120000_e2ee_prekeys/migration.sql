-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "identity_key_public" TEXT NOT NULL,
    "signing_key_public" TEXT NOT NULL,
    "signed_prekey_id" INTEGER NOT NULL,
    "signed_prekey_public" TEXT NOT NULL,
    "signed_prekey_signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_one_time_prekeys" (
    "id" UUID NOT NULL,
    "device_row_id" UUID NOT NULL,
    "prekey_id" INTEGER NOT NULL,
    "public_key" TEXT NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_one_time_prekeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_one_time_prekeys_device_row_id_prekey_id_key" ON "device_one_time_prekeys"("device_row_id", "prekey_id");

-- CreateIndex
CREATE INDEX "device_one_time_prekeys_device_row_id_consumed_at_idx" ON "device_one_time_prekeys"("device_row_id", "consumed_at");

-- AddForeignKey
ALTER TABLE "device_one_time_prekeys" ADD CONSTRAINT "device_one_time_prekeys_device_row_id_fkey" FOREIGN KEY ("device_row_id") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
