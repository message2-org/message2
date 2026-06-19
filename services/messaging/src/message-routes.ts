import type express from "express";
import type { PrismaClient } from "@prisma/client";
import type { MessageDisclosureMark } from "@message2/contracts";
import { broadcastToUsers } from "./realtime.js";
import { getChatMemberIds, messageInclude, rowToEnvelope, summarizeReactions } from "./message-envelope.js";
import { notifyMessagePush, previewTextFromCipher } from "./notify-push.js";
import { instanceConfig } from "./instance-config.js";

type AuthPayload = { sub: string; role: "user" | "admin" };
type AuthRequest = express.Request & { auth?: AuthPayload };

const EMOJI_RE = /^[\p{Extended_Pictographic}\u{FE0F}\u{200D}]{1,8}$/u;
const MESSAGE_KINDS = new Set(["text", "emoji", "sticker", "image", "video", "audio", "file"]);
const STICKER_RENDER_MODES = new Set(["large", "inline"]);
const STICKER_CODE_MAX_LENGTH = 64;
const STICKER_LABEL_MAX_LENGTH = 80;
const STICKER_TAG_MAX_LENGTH = 32;
const STICKER_ASSET_URL_MAX_LENGTH = 512;
const DEPRECATED_STICKER_PACK_SLUGS = ["default-large-emoji-stickers", "default-inline-stickers"] as const;
const DEFAULT_STICKER_PACKS = [
  {
    slug: "default-standard-emotions",
    title: "Standard emotions",
    description: "Quick common reactions for chats",
    visibility: "public",
    isSystem: true,
    stickers: [
      { code: "🙂", label: "slightly smiling", render: "inline", tags: ["smile", "friendly"], sortOrder: 10 },
      { code: "😊", label: "smiling face", render: "inline", tags: ["smile", "happy"], sortOrder: 20 },
      { code: "😉", label: "winking face", render: "inline", tags: ["wink", "playful"], sortOrder: 30 },
      { code: "😎", label: "cool face", render: "inline", tags: ["cool", "sunglasses"], sortOrder: 40 },
      { code: "🤝", label: "handshake", render: "inline", tags: ["deal", "teamwork"], sortOrder: 50 },
      { code: "🙏", label: "thanks", render: "inline", tags: ["thanks", "pray"], sortOrder: 60 },
      { code: "🔥", label: "fire", render: "inline", tags: ["fire", "hot"], sortOrder: 70 },
      { code: "🎉", label: "party popper", render: "inline", tags: ["party", "celebration"], sortOrder: 80 },
      { code: "❤️", label: "red heart", render: "inline", tags: ["love", "heart"], sortOrder: 90 },
      { code: "👍", label: "thumbs up", render: "inline", tags: ["ok", "approve"], sortOrder: 100 }
    ]
  },
  {
    slug: "default-sticker-mood",
    title: "Mood stickers",
    description: "Standalone sticker messages",
    visibility: "public",
    isSystem: true,
    stickers: [
      {
        code: "happy",
        label: "Happy",
        render: "large",
        assetUrl: "/stickers/happy.svg",
        animated: false,
        tags: ["happy", "smile"],
        sortOrder: 10
      },
      {
        code: "love",
        label: "Love",
        render: "large",
        assetUrl: "/stickers/love.svg",
        animated: false,
        tags: ["love", "heart"],
        sortOrder: 20
      },
      {
        code: "wow",
        label: "Wow",
        render: "large",
        assetUrl: "/stickers/wow.svg",
        animated: false,
        tags: ["wow", "surprised"],
        sortOrder: 30
      },
      {
        code: "party",
        label: "Party",
        render: "large",
        assetUrl: "/stickers/party.svg",
        animated: false,
        tags: ["party", "celebrate"],
        sortOrder: 40
      },
      {
        code: "sleepy",
        label: "Sleepy",
        render: "large",
        assetUrl: "/stickers/sleepy.svg",
        animated: false,
        tags: ["sleep", "tired"],
        sortOrder: 50
      },
      {
        code: "angry",
        label: "Angry",
        render: "large",
        assetUrl: "/stickers/angry.svg",
        animated: false,
        tags: ["angry", "mad"],
        sortOrder: 60
      }
    ]
  },
  {
    slug: "default-emotion-gifs",
    title: "Emotion GIFs",
    description: "Animated reactions from bundled media",
    visibility: "public",
    isSystem: true,
    stickers: [
      {
        code: "happy",
        label: "Happy",
        render: "large",
        assetUrl: "/emotion-assets/gifs/happy.gif",
        animated: true,
        tags: ["happy", "gif", "emotion"],
        sortOrder: 10
      },
      {
        code: "wow",
        label: "Wow",
        render: "large",
        assetUrl: "/emotion-assets/gifs/wow.gif",
        animated: true,
        tags: ["wow", "gif", "emotion"],
        sortOrder: 20
      },
      {
        code: "party",
        label: "Party",
        render: "large",
        assetUrl: "/emotion-assets/gifs/party.gif",
        animated: true,
        tags: ["party", "gif", "emotion"],
        sortOrder: 30
      },
      {
        code: "thanks",
        label: "Thanks",
        render: "large",
        assetUrl: "/emotion-assets/gifs/thanks.gif",
        animated: true,
        tags: ["thanks", "gif", "emotion"],
        sortOrder: 40
      }
    ]
  }
] as const;

type StickerSeedItem = {
  code: string;
  label: string;
  render: string;
  assetUrl?: string;
  animated?: boolean;
  tags: readonly string[];
  sortOrder: number;
};

export type StickerPackSeedDefinition = {
  slug: string;
  title: string;
  description: string;
  visibility: string;
  isSystem: boolean;
  stickers: readonly StickerSeedItem[];
};

export async function upsertStickerPackDefinition(prisma: PrismaClient, pack: StickerPackSeedDefinition) {
  const dbPack = await prisma.stickerPack.upsert({
    where: { slug: pack.slug },
    create: {
      slug: pack.slug,
      title: pack.title,
      description: pack.description,
      visibility: pack.visibility,
      isSystem: pack.isSystem,
      stickers: {
        create: pack.stickers.map((item) => ({
          code: item.code,
          label: item.label,
          render: item.render,
          assetUrl: item.assetUrl ?? null,
          animated: item.animated ?? false,
          tags: [...item.tags],
          sortOrder: item.sortOrder
        }))
      }
    },
    update: {
      title: pack.title,
      description: pack.description,
      visibility: pack.visibility,
      isSystem: pack.isSystem
    }
  });
  for (const item of pack.stickers) {
    await prisma.sticker.upsert({
      where: { packId_code: { packId: dbPack.id, code: item.code } },
      create: {
        packId: dbPack.id,
        code: item.code,
        label: item.label,
        render: item.render,
        assetUrl: item.assetUrl ?? null,
        animated: item.animated ?? false,
        tags: [...item.tags],
        sortOrder: item.sortOrder
      },
      update: {
        label: item.label,
        render: item.render,
        assetUrl: item.assetUrl ?? null,
        animated: item.animated ?? false,
        tags: [...item.tags],
        sortOrder: item.sortOrder
      }
    });
  }
  return dbPack;
}

function stickerRowToDto(item: {
  id: string;
  packId: string;
  code: string;
  label: string;
  render: string;
  assetUrl: string | null;
  animated: boolean;
  tags: string[];
  sortOrder: number;
}) {
  return {
    id: item.id,
    packId: item.packId,
    code: item.code,
    label: item.label,
    render: item.render,
    assetUrl: item.assetUrl ?? undefined,
    animated: item.animated,
    tags: item.tags,
    sortOrder: item.sortOrder
  };
}

function parseStickerAssetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > STICKER_ASSET_URL_MAX_LENGTH) return null;
  return trimmed;
}

function parseStickerAnimated(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

type Deps = {
  prisma: PrismaClient;
  auth: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
  isChatMember: (chatId: string, userId: string) => Promise<boolean>;
  internalServiceSecret?: string;
};

export function registerMessageRoutes(app: express.Express, deps: Deps) {
  const { prisma, auth, isChatMember } = deps;
  let stickerSeedPromise: Promise<void> | null = null;

  const ensureDefaultStickerPacks = () => {
    if (stickerSeedPromise) return stickerSeedPromise;
    stickerSeedPromise = (async () => {
      await prisma.stickerPack.deleteMany({
        where: { slug: { in: [...DEPRECATED_STICKER_PACK_SLUGS] }, isSystem: true }
      });
      for (const pack of DEFAULT_STICKER_PACKS) {
        await upsertStickerPackDefinition(prisma, pack);
      }
    })().catch((error) => {
      stickerSeedPromise = null;
      throw error;
    });
    return stickerSeedPromise;
  };

  app.get("/chats/:chatId/messages", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const viewerId = req.auth!.sub;
    if (!(await isChatMember(chatId, viewerId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const [rows, disclosures, tombstones, hiddenRows] = await Promise.all([
      prisma.message.findMany({
        where: { chatId },
        orderBy: { sentAt: "asc" },
        include: messageInclude
      }),
      prisma.messageDisclosure.findMany({ where: { chatId } }),
      prisma.messageTombstone.findMany({ where: { chatId }, orderBy: { deletedAt: "asc" } }),
      prisma.messageHide.findMany({
        where: { userId: viewerId, message: { chatId } },
        select: { messageId: true }
      })
    ]);

    const hiddenMessageIds = new Set(hiddenRows.map((row) => row.messageId));
    const visibleRows = rows.filter((row) => !hiddenMessageIds.has(row.id));

    const disclosureByMessage = new Map<string, MessageDisclosureMark>();
    for (const row of rows) {
      const latest = row.disclosures[row.disclosures.length - 1];
      if (latest) {
        disclosureByMessage.set(row.id, {
          eventId: latest.eventId,
          action: latest.action as MessageDisclosureMark["action"],
          disclosureLevel: latest.disclosureLevel as MessageDisclosureMark["disclosureLevel"]
        });
      }
    }
    for (const item of disclosures) {
      if (!disclosureByMessage.has(item.messageId)) {
        disclosureByMessage.set(item.messageId, {
          eventId: item.eventId,
          action: item.action as MessageDisclosureMark["action"],
          disclosureLevel: item.disclosureLevel as MessageDisclosureMark["disclosureLevel"]
        });
      }
    }

    const envelopes = visibleRows.map((row) =>
      rowToEnvelope(row, viewerId, { disclosure: disclosureByMessage.get(row.id) })
    );

    for (const tomb of tombstones) {
      envelopes.push(
        rowToEnvelope(
          {
            id: tomb.messageId,
            chatId: tomb.chatId,
            senderId: tomb.senderId ?? "00000000-0000-0000-0000-000000000000",
            cipherText: "",
            sentAt: tomb.sentAt ?? tomb.deletedAt,
            kind: tomb.kind ?? "text",
            mediaId: null,
            editedAt: null,
            deletedAt: null,
            replyToMessageId: null
          },
          viewerId,
          {
            isTombstone: true,
            tombstoneLabel: tomb.label,
            disclosure: {
              eventId: tomb.eventId,
              action: "message_delete",
              disclosureLevel: "partial"
            }
          }
        )
      );
    }

    envelopes.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    res.json(envelopes);
  });

  app.get("/sticker-packs", auth, async (req: AuthRequest, res) => {
    await ensureDefaultStickerPacks();
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const render = typeof req.query.render === "string" ? req.query.render.trim() : "";
    const renderFilter = STICKER_RENDER_MODES.has(render) ? render : null;

    const rows = await prisma.stickerPack.findMany({
      where: {
        visibility: { in: ["public", "corporate"] },
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        stickers: {
          where: renderFilter ? { render: renderFilter } : undefined,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ isSystem: "desc" }, { title: "asc" }]
    });
    res.json(
      rows.map((pack) => ({
        id: pack.id,
        slug: pack.slug,
        title: pack.title,
        description: pack.description ?? undefined,
        visibility: pack.visibility,
        isSystem: pack.isSystem,
        stickers: pack.stickers.map((item) => stickerRowToDto(item))
      }))
    );
  });

  app.get("/stickers/search", auth, async (req: AuthRequest, res) => {
    await ensureDefaultStickerPacks();
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const render = typeof req.query.render === "string" ? req.query.render.trim() : "";
    const limitRaw = Number.parseInt(String(req.query.limit ?? "40"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 40;

    const rows = await prisma.sticker.findMany({
      where: {
        ...(STICKER_RENDER_MODES.has(render) ? { render } : {}),
        ...(query
          ? {
              OR: [
                { code: { contains: query, mode: "insensitive" } },
                { label: { contains: query, mode: "insensitive" } },
                { tags: { has: query.toLowerCase() } }
              ]
            }
          : {})
      },
      include: { pack: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: limit
    });

    res.json(rows.map((item) => stickerRowToDto(item)));
  });

  app.post("/sticker-packs", auth, async (req: AuthRequest, res) => {
    await ensureDefaultStickerPacks();
    const role = req.auth!.role;
    const title = String(req.body.title ?? "").trim();
    const descriptionRaw = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const requestedVisibility = String(req.body.visibility ?? "").trim().toLowerCase();
    const slugInput = typeof req.body.slug === "string" ? req.body.slug : title;
    const slug = normalizeSlug(slugInput);

    if (!title || title.length > 80) {
      res.status(400).json({ error: "invalid_title" });
      return;
    }
    if (!slug) {
      res.status(400).json({ error: "invalid_slug" });
      return;
    }

    const isCorporateProfile = instanceConfig.deploymentProfile === "corporate";
    if (isCorporateProfile && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }

    const visibility = isCorporateProfile
      ? "corporate"
      : requestedVisibility === "private" || requestedVisibility === "corporate"
        ? requestedVisibility
        : "public";

    try {
      const created = await prisma.stickerPack.create({
        data: {
          slug,
          title,
          description: descriptionRaw || null,
          visibility,
          isSystem: false
        }
      });
      res.status(201).json({
        id: created.id,
        slug: created.slug,
        title: created.title,
        description: created.description ?? undefined,
        visibility: created.visibility,
        isSystem: created.isSystem,
        stickers: []
      });
    } catch {
      res.status(409).json({ error: "sticker_pack_slug_exists" });
    }
  });

  app.post("/sticker-packs/:packId/stickers", auth, async (req: AuthRequest, res) => {
    await ensureDefaultStickerPacks();
    const packId = routeParam(req.params.packId);
    if (!packId) {
      res.status(400).json({ error: "invalid_pack_id" });
      return;
    }

    const role = req.auth!.role;
    const code = String(req.body.code ?? "").trim();
    const label = String(req.body.label ?? "").trim();
    const render = String(req.body.render ?? "inline").trim().toLowerCase();
    const sortOrderRaw = Number.parseInt(String(req.body.sortOrder ?? "0"), 10);
    const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0;
    const tagsRaw: unknown[] = Array.isArray(req.body.tags) ? req.body.tags : [];
    const tags = tagsRaw
      .filter((item: unknown): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item: string) => item.length > 0 && item.length <= STICKER_TAG_MAX_LENGTH)
      .slice(0, 16);

    const assetUrl = parseStickerAssetUrl(req.body.assetUrl);
    const animated = parseStickerAnimated(req.body.animated);

    if (!code || code.length > STICKER_CODE_MAX_LENGTH) {
      res.status(400).json({ error: "invalid_sticker_code" });
      return;
    }
    if (!label || label.length > STICKER_LABEL_MAX_LENGTH) {
      res.status(400).json({ error: "invalid_sticker_label" });
      return;
    }
    if (!STICKER_RENDER_MODES.has(render)) {
      res.status(400).json({ error: "invalid_sticker_render_mode" });
      return;
    }
    if (render === "large" && !assetUrl) {
      res.status(400).json({ error: "sticker_asset_url_required" });
      return;
    }

    const pack = await prisma.stickerPack.findUnique({
      where: { id: packId },
      select: { id: true, isSystem: true, visibility: true }
    });
    if (!pack) {
      res.status(404).json({ error: "sticker_pack_not_found" });
      return;
    }
    if (pack.isSystem && role !== "admin") {
      res.status(403).json({ error: "system_pack_readonly" });
      return;
    }
    if (instanceConfig.deploymentProfile === "corporate" && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }

    try {
      const created = await prisma.sticker.create({
        data: {
          packId,
          code,
          label,
          render,
          assetUrl,
          animated,
          tags,
          sortOrder
        }
      });
      res.status(201).json(stickerRowToDto(created));
    } catch {
      res.status(409).json({ error: "sticker_code_exists_in_pack" });
    }
  });

  app.patch("/sticker-packs/:packId", auth, async (req: AuthRequest, res) => {
    const packId = routeParam(req.params.packId);
    if (!packId) {
      res.status(400).json({ error: "invalid_pack_id" });
      return;
    }
    const role = req.auth!.role;
    const pack = await prisma.stickerPack.findUnique({
      where: { id: packId },
      select: { id: true, isSystem: true }
    });
    if (!pack) {
      res.status(404).json({ error: "sticker_pack_not_found" });
      return;
    }
    if (pack.isSystem && role !== "admin") {
      res.status(403).json({ error: "system_pack_readonly" });
      return;
    }
    if (instanceConfig.deploymentProfile === "corporate" && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const requestedVisibility = typeof req.body.visibility === "string" ? req.body.visibility.trim().toLowerCase() : "";
    const hasAnyChange = Boolean(title || description || requestedVisibility);
    if (!hasAnyChange) {
      res.status(400).json({ error: "no_changes_provided" });
      return;
    }

    const updated = await prisma.stickerPack.update({
      where: { id: packId },
      data: {
        ...(title ? { title } : {}),
        ...(typeof req.body.description === "string" ? { description: description || null } : {}),
        ...(requestedVisibility === "public" || requestedVisibility === "private" || requestedVisibility === "corporate"
          ? { visibility: requestedVisibility }
          : {})
      }
    });
    res.json({
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      description: updated.description ?? undefined,
      visibility: updated.visibility,
      isSystem: updated.isSystem
    });
  });

  app.delete("/sticker-packs/:packId", auth, async (req: AuthRequest, res) => {
    const packId = routeParam(req.params.packId);
    if (!packId) {
      res.status(400).json({ error: "invalid_pack_id" });
      return;
    }
    const role = req.auth!.role;
    const pack = await prisma.stickerPack.findUnique({
      where: { id: packId },
      select: { id: true, isSystem: true }
    });
    if (!pack) {
      res.status(404).json({ error: "sticker_pack_not_found" });
      return;
    }
    if (pack.isSystem && role !== "admin") {
      res.status(403).json({ error: "system_pack_readonly" });
      return;
    }
    if (instanceConfig.deploymentProfile === "corporate" && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }
    await prisma.stickerPack.delete({ where: { id: packId } });
    res.status(204).end();
  });

  app.patch("/stickers/:stickerId", auth, async (req: AuthRequest, res) => {
    const stickerId = routeParam(req.params.stickerId);
    if (!stickerId) {
      res.status(400).json({ error: "invalid_sticker_id" });
      return;
    }
    const role = req.auth!.role;
    const existing = await prisma.sticker.findUnique({
      where: { id: stickerId },
      include: { pack: { select: { isSystem: true } } }
    });
    if (!existing) {
      res.status(404).json({ error: "sticker_not_found" });
      return;
    }
    if (existing.pack.isSystem && role !== "admin") {
      res.status(403).json({ error: "system_pack_readonly" });
      return;
    }
    if (instanceConfig.deploymentProfile === "corporate" && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }

    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
    const label = typeof req.body.label === "string" ? req.body.label.trim() : "";
    const render = typeof req.body.render === "string" ? req.body.render.trim().toLowerCase() : "";
    const sortOrderRaw = Number.parseInt(String(req.body.sortOrder ?? ""), 10);
    const hasAssetUrl = Object.prototype.hasOwnProperty.call(req.body, "assetUrl");
    const assetUrl = hasAssetUrl ? parseStickerAssetUrl(req.body.assetUrl) : undefined;
    const hasAnimated = Object.prototype.hasOwnProperty.call(req.body, "animated");
    const animated = hasAnimated ? parseStickerAnimated(req.body.animated) : undefined;
    const tagsRaw: unknown[] = Array.isArray(req.body.tags) ? req.body.tags : [];
    const tags = tagsRaw
      .filter((item: unknown): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item: string) => item.length > 0 && item.length <= STICKER_TAG_MAX_LENGTH)
      .slice(0, 16);

    const nextRender = STICKER_RENDER_MODES.has(render) ? render : existing.render;
    const nextAssetUrl = hasAssetUrl ? assetUrl : existing.assetUrl;
    if (nextRender === "large" && !nextAssetUrl) {
      res.status(400).json({ error: "sticker_asset_url_required" });
      return;
    }

    const updated = await prisma.sticker.update({
      where: { id: stickerId },
      data: {
        ...(code ? { code } : {}),
        ...(label ? { label } : {}),
        ...(STICKER_RENDER_MODES.has(render) ? { render } : {}),
        ...(Number.isFinite(sortOrderRaw) ? { sortOrder: sortOrderRaw } : {}),
        ...(Array.isArray(req.body.tags) ? { tags } : {}),
        ...(hasAssetUrl ? { assetUrl } : {}),
        ...(hasAnimated ? { animated } : {})
      }
    });
    res.json(stickerRowToDto(updated));
  });

  app.delete("/stickers/:stickerId", auth, async (req: AuthRequest, res) => {
    const stickerId = routeParam(req.params.stickerId);
    if (!stickerId) {
      res.status(400).json({ error: "invalid_sticker_id" });
      return;
    }
    const role = req.auth!.role;
    const existing = await prisma.sticker.findUnique({
      where: { id: stickerId },
      include: { pack: { select: { isSystem: true } } }
    });
    if (!existing) {
      res.status(404).json({ error: "sticker_not_found" });
      return;
    }
    if (existing.pack.isSystem && role !== "admin") {
      res.status(403).json({ error: "system_pack_readonly" });
      return;
    }
    if (instanceConfig.deploymentProfile === "corporate" && role !== "admin") {
      res.status(403).json({ error: "custom_sticker_packs_restricted" });
      return;
    }
    await prisma.sticker.delete({ where: { id: stickerId } });
    res.status(204).end();
  });

  app.post("/chats/:chatId/messages", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const senderId = req.auth!.sub;
    if (!(await isChatMember(chatId, senderId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const replyToMessageId =
      typeof req.body.replyToMessageId === "string" ? req.body.replyToMessageId.trim() : "";
    if (replyToMessageId) {
      const parent = await prisma.message.findFirst({
        where: { id: replyToMessageId, chatId, deletedAt: null }
      });
      if (!parent) {
        res.status(400).json({ error: "invalid_reply_target" });
        return;
      }
    }

    const cipherText = String(req.body.cipherText ?? "").trim();
    const kind = String(req.body.kind ?? "text").trim();
    if (!cipherText) {
      res.status(400).json({ error: "cipher_text_required" });
      return;
    }
    if (!MESSAGE_KINDS.has(kind)) {
      res.status(400).json({ error: "invalid_message_kind" });
      return;
    }

    const row = await prisma.message.create({
      data: {
        chatId,
        senderId,
        cipherText,
        kind,
        mediaId: typeof req.body.mediaId === "string" ? req.body.mediaId : null,
        ...(replyToMessageId ? { replyToMessageId } : {})
      },
      include: messageInclude
    });

    const envelope = rowToEnvelope(row, senderId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.created", payload: envelope });
    notifyMessagePush({
      recipientUserIds: members,
      excludeUserId: senderId,
      chatId,
      messageId: row.id,
      senderId,
      senderDisplayName: row.sender?.displayName,
      previewText: previewTextFromCipher(row.cipherText)
    });
    res.status(201).json(envelope);
  });

  app.patch("/chats/:chatId/messages/:messageId", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const existing = await prisma.message.findFirst({ where: { id: messageId, chatId } });
    if (!existing || existing.deletedAt) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }
    if (existing.senderId !== userId) {
      res.status(403).json({ error: "only_sender_can_edit" });
      return;
    }

    const cipherText = String(req.body.cipherText ?? "").trim();
    if (!cipherText) {
      res.status(400).json({ error: "cipher_text_required" });
      return;
    }

    const row = await prisma.message.update({
      where: { id: messageId },
      data: { cipherText, editedAt: new Date() },
      include: messageInclude
    });
    const envelope = rowToEnvelope(row, userId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.updated", payload: envelope });
    res.json(envelope);
  });

  app.delete("/chats/:chatId/messages/:messageId", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const scope = typeof req.query.scope === "string" ? req.query.scope : "everyone";
    const existing = await prisma.message.findFirst({ where: { id: messageId, chatId } });
    if (!existing || existing.deletedAt) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }

    if (scope === "self") {
      await prisma.messageHide.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId },
        update: { hiddenAt: new Date() }
      });
      res.json({ ok: true, scope: "self", chatId, messageId });
      return;
    }

    if (existing.senderId !== userId) {
      res.status(403).json({ error: "only_sender_can_delete" });
      return;
    }

    const row = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: userId },
      include: messageInclude
    });
    const envelope = rowToEnvelope(row, userId);
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.deleted", payload: envelope });
    res.json({ ...envelope, scope: "everyone" });
  });

  app.put("/chats/:chatId/messages/:messageId/reactions", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    const messageId = routeParam(req.params.messageId);
    if (!chatId || !messageId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim() : "";
    if (!emoji || !EMOJI_RE.test(emoji)) {
      res.status(400).json({ error: "invalid_emoji" });
      return;
    }

    const existing = await prisma.message.findFirst({
      where: { id: messageId, chatId, deletedAt: null }
    });
    if (!existing) {
      res.status(404).json({ error: "message_not_found" });
      return;
    }

    const prior = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } }
    });
    if (prior?.emoji === emoji) {
      await prisma.messageReaction.delete({
        where: { messageId_userId: { messageId, userId } }
      });
    } else {
      await prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, emoji },
        update: { emoji }
      });
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
      orderBy: { createdAt: "asc" }
    });
    const summarized = summarizeReactions(reactions, userId);
    const payload = { chatId, messageId, reactions: summarized };
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, { type: "message.reactions", payload });
    res.json(payload);
  });

  app.post("/chats/:chatId/read", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const readAt = new Date();
    await prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadAt: readAt }
    });

    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(members, {
      type: "chat.read",
      payload: { chatId, userId, readAt: readAt.toISOString() }
    });
    res.json({ ok: true, readAt: readAt.toISOString() });
  });

  app.post("/chats/:chatId/typing", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const userId = req.auth!.sub;
    if (!(await isChatMember(chatId, userId))) {
      res.status(403).json({ error: "chat access denied" });
      return;
    }

    const typing = req.body?.typing !== false;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true }
    });
    const members = await getChatMemberIds(prisma, chatId);
    broadcastToUsers(
      members.filter((id) => id !== userId),
      {
        type: "chat.typing",
        payload: {
          chatId,
          userId,
          displayName: user?.displayName ?? "",
          typing
        }
      }
    );
    res.json({ ok: true });
  });

  const internalSecret = deps.internalServiceSecret?.trim();
  if (internalSecret) {
    const requireInternalService = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const header = req.header("x-internal-secret") ?? "";
      if (!header || header !== internalSecret) {
        res.status(401).json({ error: "invalid internal service credentials" });
        return;
      }
      next();
    };

    app.post("/internal/sticker-packs/import", requireInternalService, async (req, res) => {
      const body = req.body as Partial<StickerPackSeedDefinition> | undefined;
      const slug = typeof body?.slug === "string" ? normalizeSlug(body.slug) : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      if (!slug || !title || !Array.isArray(body?.stickers) || body.stickers.length === 0) {
        res.status(400).json({ error: "invalid_sticker_import_payload" });
        return;
      }
      const stickers: StickerSeedItem[] = [];
      for (const raw of body.stickers) {
        if (typeof raw?.code !== "string" || typeof raw?.label !== "string" || typeof raw?.render !== "string") {
          res.status(400).json({ error: "invalid_sticker_item" });
          return;
        }
        const code = raw.code.trim().slice(0, STICKER_CODE_MAX_LENGTH);
        const label = raw.label.trim().slice(0, STICKER_LABEL_MAX_LENGTH);
        const render = raw.render.trim();
        if (!code || !label || !STICKER_RENDER_MODES.has(render)) {
          res.status(400).json({ error: "invalid_sticker_item" });
          return;
        }
        const tags = Array.isArray(raw.tags)
          ? raw.tags
              .filter((tag: unknown): tag is string => typeof tag === "string")
              .map((tag: string) => tag.trim().slice(0, STICKER_TAG_MAX_LENGTH))
              .filter(Boolean)
          : [];
        stickers.push({
          code,
          label,
          render,
          assetUrl: parseStickerAssetUrl(raw.assetUrl) ?? undefined,
          animated: parseStickerAnimated(raw.animated),
          tags,
          sortOrder: typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0
        });
      }
      try {
        const pack = await upsertStickerPackDefinition(prisma, {
          slug,
          title,
          description: typeof body.description === "string" ? body.description.trim().slice(0, 240) : "",
          visibility: body.visibility === "private" ? "private" : "public",
          isSystem: body.isSystem === true,
          stickers
        });
        res.status(200).json({ ok: true, packId: pack.id, slug: pack.slug, stickerCount: stickers.length });
      } catch (error) {
        console.error("[internal/sticker-packs/import]", error);
        res.status(500).json({ error: "sticker_import_failed" });
      }
    });
  }
}
