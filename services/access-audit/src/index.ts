import { createAccessAuditApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

const app = createAccessAuditApp();
const port = Number(process.env.PORT ?? 4004);

const start = async () => {
  if (config.auditStore === "postgres") {
    await prisma.$connect();
    console.log("[access-audit] audit store: postgres (append-only)");
  } else {
    console.warn("[access-audit] audit store: in-memory (set DATABASE_URL for postgres)");
  }
  app.listen(port, () => console.log(`access-audit listening on :${port}`));
};

start().catch((error) => {
  console.error("[access-audit] failed to start", error);
  process.exit(1);
});

const shutdown = async () => {
  if (config.auditStore === "postgres") {
    await prisma.$disconnect();
  }
};

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});
