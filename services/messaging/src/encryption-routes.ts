import type express from "express";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { isEncryptionMode } from "@message2/contracts";
import {
  ensureInstanceEncryptionPolicy,
  getChatEncryptionState,
  requestChatEncryptionMode,
  respondToDowngradeRequest,
  updateInstanceEncryptionPolicy,
  validateInstancePolicyInput
} from "./encryption-policy.js";

type AuthPayload = { sub: string; role: "user" | "admin" };
type AuthRequest = express.Request & { auth?: AuthPayload };

type RouteDeps = {
  app: Express;
  prisma: PrismaClient;
  auth: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
  requireAdmin: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
};

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export const registerEncryptionRoutes = ({ app, prisma, auth, requireAdmin }: RouteDeps) => {
  app.get("/admin/encryption/policy", auth, requireAdmin, async (_req, res) => {
    const policy = await ensureInstanceEncryptionPolicy(prisma);
    res.json(policy);
  });

  app.put("/admin/encryption/policy", auth, requireAdmin, async (req: AuthRequest, res) => {
    const validated = validateInstancePolicyInput(req.body as Record<string, unknown>);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const saved = await updateInstanceEncryptionPolicy(prisma, validated.value, req.auth?.sub);
    res.json(saved);
  });

  app.get("/chats/:chatId/encryption", auth, async (req: AuthRequest, res) => {
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const state = await getChatEncryptionState(prisma, chatId, req.auth!.sub);
    if (!state) {
      res.status(404).json({ error: "chat_not_found" });
      return;
    }
    res.json(state);
  });

  app.post("/chats/:chatId/encryption", auth, async (req: AuthRequest, res) => {
    const modeRaw = (req.body as { mode?: string }).mode ?? "";
    if (!isEncryptionMode(modeRaw)) {
      res.status(400).json({ error: "invalid_encryption_mode" });
      return;
    }
    const chatId = routeParam(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "invalid_chat_id" });
      return;
    }
    const result = await requestChatEncryptionMode(prisma, chatId, req.auth!.sub, modeRaw);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result);
  });

  app.post("/chats/:chatId/encryption/downgrade/:requestId/respond", auth, async (req: AuthRequest, res) => {
    const accept = Boolean((req.body as { accept?: boolean }).accept);
    const chatId = routeParam(req.params.chatId);
    const requestId = routeParam(req.params.requestId);
    if (!chatId || !requestId) {
      res.status(400).json({ error: "invalid_route_params" });
      return;
    }
    const result = await respondToDowngradeRequest(prisma, chatId, requestId, req.auth!.sub, accept);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });
};
