-- Message kind query optimization for richer content types.
CREATE INDEX "Message_kind_idx" ON "Message"("kind");

-- Sticker packs catalog (public/corporate/system presets).
CREATE TABLE "sticker_packs" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'public',
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sticker_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sticker_packs_slug_key" ON "sticker_packs"("slug");
CREATE INDEX "sticker_packs_visibility_is_system_idx" ON "sticker_packs"("visibility", "is_system");

-- Sticker entities (large emoji stickers and inline sticker strings).
CREATE TABLE "stickers" (
  "id" UUID NOT NULL,
  "pack_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "render" TEXT NOT NULL DEFAULT 'large',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stickers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stickers_pack_id_code_key" ON "stickers"("pack_id", "code");
CREATE INDEX "stickers_pack_id_sort_order_idx" ON "stickers"("pack_id", "sort_order");
CREATE INDEX "stickers_render_idx" ON "stickers"("render");
CREATE INDEX "stickers_tags_idx" ON "stickers" USING GIN ("tags");

ALTER TABLE "stickers"
  ADD CONSTRAINT "stickers_pack_id_fkey"
  FOREIGN KEY ("pack_id")
  REFERENCES "sticker_packs"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
