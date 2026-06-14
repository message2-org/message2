#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDistributionManifest, repoRoot } from "./lib/distribution-manifest.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isStandalone = path.basename(__filename) === "check-updates.mjs";

function readLocalManifest() {
  const candidates = isStandalone
    ? [path.join(process.cwd(), "manifest.json")]
    : [
        path.join(repoRoot, "distribution", "manifest.json"),
        path.join(process.cwd(), "manifest.json")
      ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { manifest: JSON.parse(readFileSync(candidate, "utf8")), source: candidate };
    }
  }
  if (!isStandalone) {
    return { manifest: buildDistributionManifest(), source: "live workspace" };
  }
  throw new Error("manifest.json not found next to check-updates.mjs");
}

function compareSemver(a, b) {
  const pa = a.split(".").map((x) => Number(x) || 0);
  const pb = b.split(".").map((x) => Number(x) || 0);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function fetchRemoteManifest(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) {
    throw new Error(
      `Remote manifest not found (HTTP 404).\n` +
        `Publish distribution/manifest.json to ${url} (merge to develop), or compare commits manually on GitHub.`
    );
  }
  if (!response.ok) {
    throw new Error(`Remote manifest HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function main() {
  const { manifest: local, source } = readLocalManifest();
  const remoteUrl = local.update?.manifestUrl ?? local.repository?.manifestUrl;
  if (!remoteUrl) {
    throw new Error("No manifestUrl in local manifest");
  }

  console.log(`Local:  v${local.version} @ ${local.revision?.commit ?? "unknown"} (${source})`);
  const remote = await fetchRemoteManifest(remoteUrl);
  console.log(`Remote: v${remote.version} @ ${remote.revision?.commit ?? "unknown"}`);

  const versionCmp = compareSemver(remote.version, local.version);
  const commitChanged = remote.revision?.commit && remote.revision.commit !== local.revision?.commit;

  if (versionCmp > 0) {
    console.log("\nUpdate available: newer semantic version on remote.");
    console.log("Run: node update.mjs   (from archive) or pnpm distribution:update (from git clone)");
    process.exitCode = 2;
    return;
  }
  if (versionCmp === 0 && commitChanged) {
    console.log("\nUpdate available: same version label but newer commit on remote.");
    console.log("Run: node update.mjs   (from archive) or pnpm distribution:update (from git clone)");
    process.exitCode = 2;
    return;
  }
  console.log("\nUp to date.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
