#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isStandalone = path.basename(__filename) === "update.mjs";

function findRepoRoot(startDir) {
  let current = startDir;
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function run(command, cwd) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

function main() {
  const repoRoot = isStandalone ? findRepoRoot(process.cwd()) : findRepoRoot(path.resolve(__dirname, ".."));

  if (!repoRoot) {
    console.log("Git clone not detected.");
    console.log("");
    console.log("This archive points to the canonical source repository:");
    console.log("  https://github.com/message2-org/message2");
    console.log("");
    console.log("First-time setup:");
    console.log("  git clone https://github.com/message2-org/message2.git");
    console.log("  cd message2");
    console.log("  pnpm install");
    console.log("  pnpm infra:up && pnpm dev:full");
    console.log("");
    console.log("After cloning, run update from the repo root:");
    console.log("  pnpm distribution:update");
    process.exit(1);
  }

  const branch = "develop";
  run("git fetch origin", repoRoot);
  run(`git checkout ${branch}`, repoRoot);
  run(`git pull origin ${branch}`, repoRoot);
  run("pnpm install", repoRoot);
  run("pnpm db:migrate:deploy", repoRoot);
  run("pnpm build", repoRoot);
  console.log("\nUpdate complete.");
}

main();
