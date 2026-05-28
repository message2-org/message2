#!/usr/bin/env node
/**
 * Imports sticker/GIF assets from a zip archive or directory into public/emotion-import/
 * and registers a sticker pack via messaging internal API.
 *
 * Usage:
 *   pnpm media:import-stickers -- --zip private/media-import/inbox/mood.zip --slug mood --title "Mood"
 *   pnpm media:import-stickers -- --dir private/media-import/extracted/mood --slug mood --title "Mood"
 *
 * Env: MESSAGING_URL (default http://localhost:4001), INTERNAL_SERVICE_SECRET
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const publicImportRoot = join(repoRoot, "apps/web/public/emotion-import");

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const messagingUrl = process.env.MESSAGING_URL ?? "http://localhost:4001";
const internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal";

function parseArgs(argv) {
  const out = { zip: null, dir: null, slug: null, title: null, system: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--zip") out.zip = argv[++i];
    else if (arg === "--dir") out.dir = argv[++i];
    else if (arg === "--slug") out.slug = argv[++i];
    else if (arg === "--title") out.title = argv[++i];
    else if (arg === "--system") out.system = true;
  }
  return out;
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const result = spawnSync("unzip", ["-q", "-o", zipPath, "-d", destDir], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`unzip failed for ${zipPath} (is unzip installed?)`);
  }
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function loadEnvSecret() {
  const envPath = join(repoRoot, "services/messaging/.env");
  if (!process.env.INTERNAL_SERVICE_SECRET && existsSync(envPath)) {
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/^INTERNAL_SERVICE_SECRET=(.+)$/m);
    if (match?.[1]) return match[1].trim();
  }
  return internalSecret;
}

async function registerPack(pack) {
  const secret = loadEnvSecret();
  const response = await fetch(`${messagingUrl}/internal/sticker-packs/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret
    },
    body: JSON.stringify(pack)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`import failed (${response.status}): ${body}`);
  }
  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.title) {
    console.error("Required: --slug <slug> --title <title> and one of --zip or --dir");
    process.exit(1);
  }
  const slug = normalizeSlug(args.slug);
  if (!slug) {
    console.error("Invalid slug");
    process.exit(1);
  }

  const stagingDir = join(publicImportRoot, slug);
  mkdirSync(stagingDir, { recursive: true });

  let sourceDir = args.dir;
  if (args.zip) {
    const zipPath = join(repoRoot, args.zip);
    if (!existsSync(zipPath)) {
      console.error(`Zip not found: ${zipPath}`);
      process.exit(1);
    }
    const extractTo = join(stagingDir, "_extracted");
    extractZip(zipPath, extractTo);
    sourceDir = extractTo;
  }

  if (!sourceDir) {
    console.error("Provide --zip or --dir");
    process.exit(1);
  }

  const absSource = join(repoRoot, sourceDir);
  if (!existsSync(absSource)) {
    console.error(`Directory not found: ${absSource}`);
    process.exit(1);
  }

  const files = walkFiles(absSource).filter((file) => IMAGE_EXT.has(extname(file).toLowerCase()));
  if (files.length === 0) {
    console.error("No image/gif files found in archive");
    process.exit(1);
  }

  const stickers = [];
  let order = 10;
  for (const file of files.sort()) {
    const name = basename(file);
    const dest = join(stagingDir, name);
    if (file !== dest) copyFileSync(file, dest);
    const ext = extname(name).toLowerCase();
    const code = normalizeSlug(basename(name, ext)) || `asset-${order}`;
    stickers.push({
      code,
      label: code.replace(/-/g, " "),
      render: "large",
      assetUrl: `/emotion-import/${slug}/${name}`,
      animated: ext === ".gif",
      tags: [slug, ext === ".gif" ? "gif" : "image"],
      sortOrder: order
    });
    order += 10;
  }

  const pack = {
    slug,
    title: args.title,
    description: `Imported pack (${stickers.length} assets)`,
    visibility: "public",
    isSystem: args.system,
    stickers
  };

  const manifestPath = join(publicImportRoot, `${slug}.manifest.json`);
  writeFileSync(manifestPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  console.log(`wrote ${manifestPath}`);

  try {
    const result = await registerPack(pack);
    console.log("registered sticker pack:", result);
  } catch (error) {
    console.warn("API import skipped (messaging offline?):", error.message);
    console.warn("Assets are in public/emotion-import; re-run when messaging is up.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
