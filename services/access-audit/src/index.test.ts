import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createAccessAuditApp } from "./app.js";
import { config } from "./config.js";
import { listAuditEvents, resetAuditStoreForTests } from "./store.js";

const adminToken = () =>
  jwt.sign({ sub: "admin-user", role: "admin" }, config.jwtSecret, { expiresIn: "1h" });

const validPayload = {
  action: "message_read",
  legalRef: "2026-12345-court-moscow",
  reasonCode: "court_order",
  reasonText: "Подробное обоснование служебного доступа с достаточным количеством символов для прохождения валидации платформы.".padEnd(120, "."),
  scope: {
    chatIds: ["550e8400-e29b-41d4-a716-446655440000"],
    messageIds: ["6ba7b810-9dad-11d1-80b4-00c04fd43008"]
  },
  actor: "internal_admin"
};

test("POST /privileged/operations requires admin and valid body", async (t) => {
  resetAuditStoreForTests();
  const app = createAccessAuditApp();
  const server = app.listen(0);
  t.after(() => {
    server.close();
  });

  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const noAuth = await fetch(`${base}/privileged/operations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validPayload)
  });
  assert.equal(noAuth.status, 401);

  const invalid = await fetch(`${base}/privileged/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken()}`
    },
    body: JSON.stringify({ ...validPayload, legalRef: "x" })
  });
  assert.equal(invalid.status, 400);
  const invalidBody = (await invalid.json()) as { error: string; details: unknown[] };
  assert.equal(invalidBody.error, "validation_failed");
  assert.ok(Array.isArray(invalidBody.details));

  const ok = await fetch(`${base}/privileged/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken()}`
    },
    body: JSON.stringify(validPayload)
  });
  assert.equal(ok.status, 201);
  const body = (await ok.json()) as { transparencyEvent: { reasonCode: string; legalRef: string } };
  assert.equal(body.transparencyEvent.reasonCode, "court_order");
  assert.equal(listAuditEvents().length, 1);
});

test("POST /privileged/read maps legacy body", async (t) => {
  resetAuditStoreForTests();
  const app = createAccessAuditApp();
  const server = app.listen(0);
  t.after(() => server.close());

  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/privileged/read`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken()}`
    },
    body: JSON.stringify({
      chatId: "550e8400-e29b-41d4-a716-446655440000",
      legalRef: "legacy-ref-001",
      reasonCode: "account_compromise",
      reasonText: "x".repeat(120)
    })
  });
  assert.equal(response.status, 201);
});
