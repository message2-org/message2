import cors from "cors";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { getMediaMeta, getMediaStream, getStorageLabel, initMediaStorage, putMediaObject } from "./storage.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "application/pdf"
]);

let storageReady = false;

const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
};

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "media", storageReady, storage: storageReady ? getStorageLabel() : null });
});

app.get("/health/ready", (_req, res) => {
  if (!storageReady) {
    res.status(503).json({ ok: false, service: "media", error: "object storage unavailable" });
    return;
  }
  res.json({ ok: true, service: "media" });
});

app.post("/upload", auth, upload.single("file"), async (req, res) => {
  if (!storageReady) {
    res.status(503).json({ error: "object storage unavailable" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  if (!allowedMimeTypes.has(req.file.mimetype)) {
    res.status(415).json({ error: "unsupported media type" });
    return;
  }

  const mediaId = randomUUID();
  try {
    const meta = await putMediaObject(mediaId, req.file.buffer, req.file.mimetype, req.file.originalname);
    res.status(201).json({
      mediaId: meta.id,
      name: meta.name,
      mime: meta.mime,
      size: meta.size,
      contentUrl: `/objects/${meta.id}/content`
    });
  } catch (error) {
    console.error("[media/upload]", error);
    res.status(500).json({ error: "failed to store media" });
  }
});

app.get("/objects/:mediaId", auth, async (req, res) => {
  if (!storageReady) {
    res.status(503).json({ error: "object storage unavailable" });
    return;
  }
  const mediaId = routeParam(req.params.mediaId);
  if (!mediaId) {
    res.status(400).json({ error: "invalid media id" });
    return;
  }
  const meta = await getMediaMeta(mediaId);
  if (!meta) {
    res.status(404).json({ error: "media not found" });
    return;
  }
  res.json({
    mediaId: meta.id,
    name: meta.name,
    mime: meta.mime,
    size: meta.size,
    contentUrl: `/objects/${meta.id}/content`
  });
});

app.get("/objects/:mediaId/content", auth, async (req, res) => {
  if (!storageReady) {
    res.status(503).json({ error: "object storage unavailable" });
    return;
  }
  const mediaId = routeParam(req.params.mediaId);
  if (!mediaId) {
    res.status(400).json({ error: "invalid media id" });
    return;
  }
  const payload = await getMediaStream(mediaId);
  if (!payload) {
    res.status(404).json({ error: "media not found" });
    return;
  }
  res.setHeader("Content-Type", payload.mime);
  if (payload.size > 0) {
    res.setHeader("Content-Length", String(payload.size));
  }
  res.setHeader("Cache-Control", "private, max-age=3600");
  payload.stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
  payload.stream.pipe(res);
});

const port = Number(process.env.PORT ?? 4002);

async function bootstrap() {
  try {
    await initMediaStorage();
    storageReady = true;
    console.log(`[media] storage ready (${getStorageLabel()})`);
  } catch (error) {
    storageReady = false;
    console.error("[media] storage init failed — uploads disabled", error);
  }

  app.listen(port, () => console.log(`media listening on :${port}`));
}

void bootstrap();
