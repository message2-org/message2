import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import jwt from "jsonwebtoken";

process.env.PUSH_STORE = "memory";
process.env.PUSH_DRY_RUN = "true";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.INTERNAL_SERVICE_SECRET = "internal-test-secret";

const { createApp, resetPushStoreForTests } = await import("./app.js");
const { dispatchMessagePush } = await import("./dispatch.js");

const listen = (app: ReturnType<typeof createApp>) =>
  new Promise<{ server: Server; base: string }>((resolve) => {
    const server = createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });

test("dispatchMessagePush dry-runs for registered web subscription", async () => {
  resetPushStoreForTests();
  const app = createApp();
  const { server, base } = await listen(app);
  const token = jwt.sign({ sub: "user-a", role: "user" }, process.env.JWT_SECRET!);

  const subRes = await fetch(`${base}/push/web/subscribe`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      endpoint: "https://push.example/sub/1",
      keys: { p256dh: "key", auth: "auth" }
    })
  });
  assert.equal(subRes.status, 201);

  const result = await dispatchMessagePush({
    recipientUserIds: ["user-a"],
    excludeUserId: "user-b",
    chatId: "chat-1",
    messageId: "msg-1",
    senderId: "user-b",
    senderDisplayName: "Bob",
    previewText: "Hello"
  });
  assert.equal(result.recipients, 1);
  assert.equal(result.web.attempted, 1);

  server.close();
});

test("POST /internal/push/message requires internal secret", async () => {
  resetPushStoreForTests();
  const app = createApp();
  const { server, base } = await listen(app);

  const unauthorized = await fetch(`${base}/internal/push/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipientUserIds: ["u1"],
      chatId: "c1",
      messageId: "m1",
      senderId: "u2",
      previewText: "Hi"
    })
  });
  assert.equal(unauthorized.status, 401);

  const ok = await fetch(`${base}/internal/push/message`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET!
    },
    body: JSON.stringify({
      recipientUserIds: ["u1"],
      chatId: "c1",
      messageId: "m1",
      senderId: "u2",
      previewText: "Hi"
    })
  });
  assert.equal(ok.status, 202);

  server.close();
});

test("GET /push/config returns service capabilities", async () => {
  const app = createApp();
  const { server, base } = await listen(app);
  const res = await fetch(`${base}/push/config`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { webPushEnabled: boolean; pushDryRun: boolean };
  assert.equal(typeof body.webPushEnabled, "boolean");
  assert.equal(typeof body.pushDryRun, "boolean");
  server.close();
});
