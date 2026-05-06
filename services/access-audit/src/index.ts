import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import type { TransparencyEvent } from "@message2/contracts";

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

app.get("/health", (_req, res) => res.json({ ok: true, service: "access-audit" }));

const events: TransparencyEvent[] = [];
const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";

type AuthPayload = { sub: string; role?: string };

const requireAuditorRole = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret) as AuthPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "admin role required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
};

app.post("/privileged/read", requireAuditorRole, (req, res) => {
  const reason = String(req.body.reason ?? "").trim();
  if (reason.length < 5) {
    res.status(400).json({ error: "detailed reason is required" });
    return;
  }
  const event: TransparencyEvent = {
    id: randomUUID(),
    chatId: req.body.chatId,
    actor: req.body.actor ?? "service",
    reason,
    createdAt: new Date().toISOString()
  };
  events.push(event);
  res.status(201).json({
    event,
    userNotification: {
      type: "transparency_notice",
      icon: "shield-eye",
      message: "К сообщению был выполнен служебный доступ."
    }
  });
});

app.get("/audit/events", requireAuditorRole, (_req, res) => {
  res.json(events);
});

const port = Number(process.env.PORT ?? 4004);
app.listen(port, () => console.log(`access-audit listening on :${port}`));
