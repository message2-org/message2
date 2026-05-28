-- Sticker image assets (Telegram/VK-style standalone sticker messages).
ALTER TABLE "stickers"
  ADD COLUMN "asset_url" TEXT,
  ADD COLUMN "animated" BOOLEAN NOT NULL DEFAULT false;
