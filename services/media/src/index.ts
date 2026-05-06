import cors from "cors";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

app.get("/health", (_req, res) => res.json({ ok: true, service: "media" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const media = new Map<string, { id: string; name: string; mime: string; size: number; previewReady: boolean }>();
const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "video/mp4", "audio/mpeg", "application/pdf"]);

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

app.post("/media/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  if (!allowedMimeTypes.has(req.file.mimetype)) {
    res.status(415).json({ error: "unsupported media type" });
    return;
  }
  const id = randomUUID();
  media.set(id, {
    id,
    name: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
    previewReady: false
  });
  res.status(201).json({ mediaId: id });
});

app.post("/media/:mediaId/preview", auth, (req, res) => {
  const item = media.get(req.params.mediaId);
  if (!item) {
    res.status(404).json({ error: "media not found" });
    return;
  }
  item.previewReady = true;
  media.set(item.id, item);
  res.json({ mediaId: item.id, previewUrl: `/media/${item.id}/preview.jpg`, kind: item.mime });
});

app.get("/media/:mediaId", auth, (req, res) => {
  const item = media.get(req.params.mediaId);
  if (!item) {
    res.status(404).json({ error: "media not found" });
    return;
  }
  res.json(item);
});

const port = Number(process.env.PORT ?? 4002);
app.listen(port, () => console.log(`media listening on :${port}`));
