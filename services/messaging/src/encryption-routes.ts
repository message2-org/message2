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

type AuthRequest = { auth?: { sub: string; role: "user" | "admin" } };

type RouteDeps = {
  app: Express;
  prisma: PrismaClient;
  auth: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
  requireAdmin: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
};

import type express from "express";

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
    const state = await getChatEncryptionState(prisma, req.params.chatId, req.auth!.sub);
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
    const result = await requestChatEncryptionMode(prisma, req.params.chatId, req.auth!.sub, modeRaw);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(result.status).json(result);
  });

  app.post("/chats/:chatId/encryption/downgrade/:requestId/respond", auth, async (req: AuthRequest, res) => {
    const accept = Boolean((req.body as { accept?: boolean }).accept);
    const result = await respondToDowngradeRequest(
      prisma,
      req.params.chatId,
      req.params.requestId,
      req.auth!.sub,
      accept
    );
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  });
};
