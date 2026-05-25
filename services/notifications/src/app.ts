import cors from "cors";
import express from "express";
import type { FcmRegisterInput, PushMessageDispatch, WebPushSubscriptionInput } from "@message2/contracts";
import { auth, requireInternalService, type AuthRequest } from "./auth.js";
import { config } from "./config.js";
import { dispatchMessagePush } from "./dispatch.js";
import { sendFcmToUsers } from "./fcm.js";
import {
  removeWebPushSubscription,
  resetPushStoreForTests,
  upsertFcmToken,
  upsertWebPushSubscription
} from "./store/index.js";
import { sendWebPushToUsers } from "./web-push.js";

export { resetPushStoreForTests };

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      service: "notifications",
      webPushEnabled: config.webPushEnabled,
      fcmEnabled: config.fcmEnabled,
      pushDryRun: config.pushDryRun,
      pushStore: config.pushStore
    })
  );

  app.get("/push/config", (_req, res) => {
    res.json({
      webPushEnabled: config.webPushEnabled,
      vapidPublicKey: config.webPushEnabled ? config.vapidPublicKey : null,
      fcmEnabled: config.fcmEnabled,
      pushDryRun: config.pushDryRun
    });
  });

  app.post("/push/web/subscribe", auth, async (req: AuthRequest, res) => {
    const body = req.body as Partial<WebPushSubscriptionInput>;
    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const authKey = typeof body.keys?.auth === "string" ? body.keys.auth : "";
    if (!endpoint || !p256dh || !authKey) {
      res.status(400).json({ error: "invalid_subscription" });
      return;
    }
    await upsertWebPushSubscription(
      req.auth!.sub,
      { endpoint, keys: { p256dh, auth: authKey } },
      req.header("user-agent") ?? undefined
    );
    res.status(201).json({ ok: true });
  });

  app.delete("/push/web/subscribe", auth, async (req: AuthRequest, res) => {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint.trim() : "";
    if (!endpoint) {
      res.status(400).json({ error: "endpoint_required" });
      return;
    }
    const removed = await removeWebPushSubscription(req.auth!.sub, endpoint);
    res.json({ ok: removed });
  });

  app.post("/push/fcm/register", auth, async (req: AuthRequest, res) => {
    const body = req.body as Partial<FcmRegisterInput>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "token_required" });
      return;
    }
    await upsertFcmToken(req.auth!.sub, {
      token,
      platform: body.platform === "ios" || body.platform === "web" ? body.platform : "android"
    });
    res.status(201).json({ ok: true });
  });

  app.post("/internal/push/message", requireInternalService, async (req, res) => {
    const body = req.body as Partial<PushMessageDispatch>;
    const recipientUserIds = Array.isArray(body.recipientUserIds)
      ? body.recipientUserIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const chatId = typeof body.chatId === "string" ? body.chatId : "";
    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const senderId = typeof body.senderId === "string" ? body.senderId : "";
    if (!chatId || !messageId || !senderId || recipientUserIds.length === 0) {
      res.status(400).json({ error: "invalid_push_payload" });
      return;
    }
    const result = await dispatchMessagePush({
      recipientUserIds,
      excludeUserId: typeof body.excludeUserId === "string" ? body.excludeUserId : undefined,
      chatId,
      messageId,
      senderId,
      senderDisplayName: typeof body.senderDisplayName === "string" ? body.senderDisplayName : undefined,
      previewText: typeof body.previewText === "string" ? body.previewText : "New message"
    });
    res.status(202).json(result);
  });

  app.post("/notifications/transparency", (_req, res) => {
    res.status(202).json({ delivered: true, type: "privileged_access_notice" });
  });

  app.post("/notifications/push", requireInternalService, async (req, res) => {
    const body = req.body as {
      userIds?: string[];
      title?: string;
      body?: string;
      data?: Record<string, string>;
    };
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.filter((id): id is string => typeof id === "string")
      : [];
    if (userIds.length === 0) {
      res.status(400).json({ error: "userIds_required" });
      return;
    }
    const payload = {
      title: body.title ?? "Message 2",
      body: body.body ?? "",
      data: body.data
    };
    const [web, fcm] = await Promise.all([sendWebPushToUsers(userIds, payload), sendFcmToUsers(userIds, payload)]);
    res.status(202).json({ ok: true, web, fcm });
  });

  return app;
};
