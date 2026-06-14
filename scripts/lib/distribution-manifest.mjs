import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "../..");

const REPOSITORY_URL = "https://github.com/message2-org/message2";
const DEFAULT_BRANCH = "develop";
const CLONE_URL = "https://github.com/message2-org/message2.git";

const PACKAGE_PATHS = {
  monorepo: "package.json",
  web: "apps/web/package.json",
  admin: "apps/admin/package.json",
  apiGateway: "services/api-gateway/package.json",
  messaging: "services/messaging/package.json",
  media: "services/media/package.json",
  notifications: "services/notifications/package.json",
  accessAudit: "services/access-audit/package.json",
  lawfulAccess: "services/lawful-access/package.json",
  contracts: "packages/contracts/package.json"
};

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function readPackageVersion(relativePath) {
  return readJson(relativePath).version ?? "0.0.0";
}

function readAndroidVersion() {
  const gradlePath = path.join(repoRoot, "apps/android/app/build.gradle.kts");
  if (!existsSync(gradlePath)) {
    return null;
  }
  const text = readFileSync(gradlePath, "utf8");
  const versionName = text.match(/versionName\s*=\s*"([^"]+)"/)?.[1] ?? "0.0.0";
  const versionCode = Number(text.match(/versionCode\s*=\s*(\d+)/)?.[1] ?? 0);
  return { versionName, versionCode };
}

function readGitRevision() {
  try {
    const commit = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
    const committedAt = execSync("git log -1 --format=%cI", { cwd: repoRoot, encoding: "utf8" }).trim();
    return { commit, branch, committedAt };
  } catch {
    return { commit: "unknown", branch: "unknown", committedAt: null };
  }
}

export function buildDistributionManifest() {
  const monorepoVersion = readPackageVersion(PACKAGE_PATHS.monorepo);
  const revision = readGitRevision();
  const android = readAndroidVersion();

  const components = {
    monorepo: readPackageVersion(PACKAGE_PATHS.monorepo),
    web: readPackageVersion(PACKAGE_PATHS.web),
    admin: readPackageVersion(PACKAGE_PATHS.admin),
    apiGateway: readPackageVersion(PACKAGE_PATHS.apiGateway),
    messaging: readPackageVersion(PACKAGE_PATHS.messaging),
    media: readPackageVersion(PACKAGE_PATHS.media),
    notifications: readPackageVersion(PACKAGE_PATHS.notifications),
    accessAudit: readPackageVersion(PACKAGE_PATHS.accessAudit),
    lawfulAccess: readPackageVersion(PACKAGE_PATHS.lawfulAccess),
    contracts: readPackageVersion(PACKAGE_PATHS.contracts)
  };
  if (android) {
    components.android = android;
  }

  return {
    schemaVersion: 1,
    product: "message2",
    version: monorepoVersion,
    repository: {
      url: REPOSITORY_URL,
      cloneUrl: CLONE_URL,
      defaultBranch: DEFAULT_BRANCH
    },
    revision,
    components,
    update: {
      manifestUrl: `https://raw.githubusercontent.com/message2-org/message2/${DEFAULT_BRANCH}/distribution/manifest.json`,
      versionEndpoint: "/version",
      procedure: [
        "git fetch origin",
        "git checkout develop && git pull origin develop",
        "pnpm install",
        "pnpm db:migrate:deploy",
        "pnpm build"
      ]
    },
    generatedAt: new Date().toISOString()
  };
}
