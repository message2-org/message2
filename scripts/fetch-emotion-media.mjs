#!/usr/bin/env node
/**
 * Downloads default emotion GIFs and short video clips into apps/web/public/emotion-assets/.
 * Run: pnpm media:fetch-emotions
 * Safe to re-run (skips existing files unless --force).
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const mediaRoot = join(repoRoot, "apps/web/public/emotion-assets");
const gifsDir = join(mediaRoot, "gifs");
const videosDir = join(mediaRoot, "videos");
const manifestPath = join(mediaRoot, "manifest.json");
const force = process.argv.includes("--force");

const GIF_SOURCES = [
  {
    id: "happy",
    file: "happy.gif",
    labelEn: "Happy",
    labelRu: "Радость",
    url: "https://media.giphy.com/media/g9582DNuQmdx9/giphy.gif"
  },
  {
    id: "wow",
    file: "wow.gif",
    labelEn: "Wow",
    labelRu: "Вау",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif"
  },
  {
    id: "party",
    file: "party.gif",
    labelEn: "Party",
    labelRu: "Вечеринка",
    url: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif"
  },
  {
    id: "thanks",
    file: "thanks.gif",
    labelEn: "Thanks",
    labelRu: "Спасибо",
    url: "https://media.giphy.com/media/26BRuo6sMaxhk0wD6/giphy.gif"
  }
];

const VIDEO_SOURCES = [
  {
    id: "wave",
    file: "wave.mp4",
    labelEn: "Wave clip",
    labelRu: "Волна",
    url: "https://www.w3schools.com/html/mov_bbb.mp4"
  },
  {
    id: "flower",
    file: "flower.mp4",
    labelEn: "Flower clip",
    labelRu: "Цветок",
    url: "https://www.w3schools.com/html/movie.mp4"
  }
];

async function download(url, dest) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

async function ensureFile(source, destDir, publicPathPrefix) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, source.file);
  if (!force && existsSync(dest)) {
    console.log(`skip ${source.file} (exists)`);
    return { ...source, url: `${publicPathPrefix}/${source.file}` };
  }
  console.log(`fetch ${source.url} -> ${dest}`);
  await download(source.url, dest);
  return { ...source, url: `${publicPathPrefix}/${source.file}` };
}

async function main() {
  mkdirSync(gifsDir, { recursive: true });
  mkdirSync(videosDir, { recursive: true });

  const gifs = [];
  for (const item of GIF_SOURCES) {
    const saved = await ensureFile(item, gifsDir, "/emotion-assets/gifs");
    gifs.push({
      id: saved.id,
      labelEn: saved.labelEn,
      labelRu: saved.labelRu,
      url: saved.url
    });
  }

  const videos = [];
  for (const item of VIDEO_SOURCES) {
    const saved = await ensureFile(item, videosDir, "/emotion-assets/videos");
    videos.push({
      id: saved.id,
      labelEn: saved.labelEn,
      labelRu: saved.labelRu,
      url: saved.url
    });
  }

  const manifest = { version: 1, gifs, videos };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`wrote ${manifestPath}`);

  const importManifestPath = join(mediaRoot, "sticker-import.json");
  const stickerImport = {
    slug: "default-emotion-gifs",
    title: "Emotion GIFs",
    description: "Animated reactions (bundled media)",
    visibility: "public",
    isSystem: true,
    stickers: gifs.map((item, index) => ({
      code: item.id,
      label: item.labelEn,
      render: "large",
      assetUrl: item.url,
      animated: true,
      tags: [item.id, "gif", "emotion"],
      sortOrder: (index + 1) * 10
    }))
  };
  writeFileSync(importManifestPath, `${JSON.stringify(stickerImport, null, 2)}\n`, "utf8");
  console.log(`wrote ${importManifestPath}`);

  if (process.argv.includes("--register")) {
    const messagingUrl = process.env.MESSAGING_URL ?? "http://localhost:4001";
    let secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret) {
      const envPath = join(repoRoot, "services/messaging/.env");
      if (existsSync(envPath)) {
        const match = readFileSync(envPath, "utf8").match(/^INTERNAL_SERVICE_SECRET=(.+)$/m);
        secret = match?.[1]?.trim();
      }
    }
    secret ??= "change-me-internal";
    const response = await fetch(`${messagingUrl}/internal/sticker-packs/import`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify(stickerImport)
    });
    if (!response.ok) {
      const body = await response.text();
      console.warn(`sticker import skipped (${response.status}): ${body}`);
    } else {
      console.log("registered default-emotion-gifs pack");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
