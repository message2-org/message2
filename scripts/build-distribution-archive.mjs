#!/usr/bin/env node
import { mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { buildDistributionManifest, repoRoot } from "./lib/distribution-manifest.mjs";

const manifest = buildDistributionManifest();
const distDir = path.join(repoRoot, "dist");
const stagingDir = path.join(distDir, ".distribution-staging");
const archiveBase = `message2-distribution-v${manifest.version}-${manifest.revision.commit.slice(0, 7)}`;
const zipPath = path.join(distDir, `${archiveBase}.zip`);

mkdirSync(distDir, { recursive: true });
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

const manifestPath = path.join(repoRoot, "distribution", "manifest.json");
mkdirSync(path.dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

writeFileSync(path.join(stagingDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
cpSync(path.join(repoRoot, "distribution", "README.md"), path.join(stagingDir, "README.md"));
cpSync(path.join(repoRoot, "distribution", "QUICKSTART.md"), path.join(stagingDir, "QUICKSTART.md"));
cpSync(path.join(repoRoot, "scripts", "check-distribution-updates.mjs"), path.join(stagingDir, "check-updates.mjs"));
cpSync(path.join(repoRoot, "scripts", "update-distribution.mjs"), path.join(stagingDir, "update.mjs"));

const readme = readFileSync(path.join(stagingDir, "README.md"), "utf8")
  .replaceAll("{{VERSION}}", manifest.version)
  .replaceAll("{{COMMIT}}", manifest.revision.commit)
  .replaceAll("{{GENERATED_AT}}", manifest.generatedAt);
writeFileSync(path.join(stagingDir, "README.md"), readme, "utf8");

function writeZipArchive() {
  try {
    execSync(`zip -rq "${zipPath}" .`, { cwd: stagingDir, stdio: "pipe" });
    return zipPath;
  } catch {
    /* fall through */
  }
  try {
    const archiveBaseNoExt = path.join(distDir, archiveBase);
    execSync(
      `python3 -c "import shutil; shutil.make_archive('${archiveBaseNoExt}', 'zip', '${stagingDir}')"`,
      { stdio: "pipe" }
    );
    return `${archiveBaseNoExt}.zip`;
  } catch {
    /* fall through */
  }
  const tarPath = zipPath.replace(/\.zip$/, ".tar.gz");
  execSync(`tar -czf "${tarPath}" -C "${stagingDir}" .`, { stdio: "inherit" });
  return tarPath;
}

const archivePath = writeZipArchive();

rmSync(stagingDir, { recursive: true, force: true });
console.log(`Distribution archive: ${archivePath}`);
console.log(`Manifest (tracked): ${manifestPath}`);
