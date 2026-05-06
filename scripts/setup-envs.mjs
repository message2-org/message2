import { constants as fsConstants } from "node:fs";
import { access, copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const skipDirs = new Set([
  ".git",
  ".pnpm-store",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo"
]);

async function pathExists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function collectEnvExamples(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) {
        continue;
      }
      await collectEnvExamples(fullPath, acc);
      continue;
    }

    if (entry.isFile() && entry.name === ".env.example") {
      acc.push(fullPath);
    }
  }

  return acc;
}

function parseEnvKeys(content) {
  const keys = new Set();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    keys.add(trimmed.slice(0, eqIndex));
  }

  return keys;
}

function collectMissingEnvLines(exampleContent, existingKeys) {
  const missingLines = [];
  const lines = exampleContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex);
    if (!existingKeys.has(key)) {
      missingLines.push(line);
    }
  }

  return missingLines;
}

const DEPRECATED_POSTGRES_HOST_PORTS = new Set(["5432", "5433"]);

function getValueForKey(content, key) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const k = trimmed.slice(0, eqIndex);
    if (k === key) {
      return trimmed.slice(eqIndex + 1);
    }
  }
  return undefined;
}

function isExpectedEnvPath(repoRootPath, envPath, ...segments) {
  const expected = path.normalize(path.join(repoRootPath, ...segments));
  return path.normalize(envPath) === expected;
}

function migrateInfraDockerEnv(repoRootPath, envPath, envContent, exampleContent) {
  if (!isExpectedEnvPath(repoRootPath, envPath, "infra", "docker", ".env")) {
    return envContent;
  }

  const examplePort = getValueForKey(exampleContent, "MESSAGE2_POSTGRES_PORT");
  if (!examplePort) {
    return envContent;
  }

  const currentPort = getValueForKey(envContent, "MESSAGE2_POSTGRES_PORT");
  if (!currentPort || !DEPRECATED_POSTGRES_HOST_PORTS.has(currentPort.trim())) {
    return envContent;
  }

  const lines = envContent.split(/\r?\n/);
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return line;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      return line;
    }
    const k = trimmed.slice(0, eqIndex);
    if (k === "MESSAGE2_POSTGRES_PORT") {
      return `${k}=${examplePort}`;
    }
    return line;
  });

  return next.join("\n");
}

function migrateMessagingDatabaseUrl(repoRootPath, envPath, envContent, exampleContent) {
  if (!isExpectedEnvPath(repoRootPath, envPath, "services", "messaging", ".env")) {
    return envContent;
  }

  const exampleUrl = getValueForKey(exampleContent, "DATABASE_URL");
  if (!exampleUrl) {
    return envContent;
  }

  const exampleMatch = exampleUrl.match(/@localhost:(\d+)\//);
  if (!exampleMatch) {
    return envContent;
  }

  const targetPort = exampleMatch[1];
  const currentUrl = getValueForKey(envContent, "DATABASE_URL");
  if (!currentUrl) {
    return envContent;
  }

  const replaced = currentUrl.replace(/@localhost:(\d+)\//, (_, port) =>
    DEPRECATED_POSTGRES_HOST_PORTS.has(port) ? `@localhost:${targetPort}/` : `@localhost:${port}/`
  );

  if (replaced === currentUrl) {
    return envContent;
  }

  const lines = envContent.split(/\r?\n/);
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return line;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      return line;
    }
    const k = trimmed.slice(0, eqIndex);
    if (k === "DATABASE_URL") {
      return `${k}=${replaced}`;
    }
    return line;
  });

  return next.join("\n");
}

async function main() {
  const envExampleFiles = await collectEnvExamples(repoRoot);

  if (envExampleFiles.length === 0) {
    console.log("[setup-envs] No .env.example files found.");
    return;
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const envExamplePath of envExampleFiles) {
    const envPath = path.join(path.dirname(envExamplePath), ".env");

    const hasEnv = await pathExists(envPath);

    if (!hasEnv) {
      await copyFile(envExamplePath, envPath, fsConstants.COPYFILE_EXCL);
      createdCount += 1;
      console.log(
        `[setup-envs] Created ${path.relative(repoRoot, envPath)} from ${path.relative(repoRoot, envExamplePath)}`
      );
      continue;
    }

    const [exampleContent, rawEnvContent] = await Promise.all([
      readFile(envExamplePath, "utf8"),
      readFile(envPath, "utf8")
    ]);

    let envContent = rawEnvContent;
    let migrated = migrateInfraDockerEnv(repoRoot, envPath, envContent, exampleContent);
    migrated = migrateMessagingDatabaseUrl(repoRoot, envPath, migrated, exampleContent);

    if (migrated !== rawEnvContent) {
      await writeFile(envPath, migrated, "utf8");
      updatedCount += 1;
      console.log(`[setup-envs] Migrated ${path.relative(repoRoot, envPath)} (deprecated Postgres host port)`);
      envContent = migrated;
    }

    const existingKeys = parseEnvKeys(envContent);
    const missingLines = collectMissingEnvLines(exampleContent, existingKeys);

    if (missingLines.length === 0) {
      if (migrated === rawEnvContent) {
        console.log(`[setup-envs] Skip existing ${path.relative(repoRoot, envPath)}`);
      }
      continue;
    }

    const prefix = envContent.endsWith("\n") || envContent.length === 0 ? "" : "\n";
    const patchBlock = `\n# Added automatically from .env.example\n${missingLines.join("\n")}\n`;
    await writeFile(envPath, `${envContent}${prefix}${patchBlock}`, "utf8");
    updatedCount += 1;
    console.log(
      `[setup-envs] Updated ${path.relative(repoRoot, envPath)} with ${missingLines.length} missing key(s)`
    );
  }

  if (createdCount === 0 && updatedCount === 0) {
    console.log("[setup-envs] No changes were required.");
  } else {
    console.log(`[setup-envs] Done. Created ${createdCount} file(s), updated ${updatedCount} file(s).`);
  }
}

main().catch((error) => {
  console.error("[setup-envs] Failed:", error);
  process.exitCode = 1;
});
