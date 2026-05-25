import test from "node:test";
import assert from "node:assert/strict";

process.env.AUDIT_STORE = "memory";

import { createLawfulAccessApp } from "./app.js";
import { createAccessAuditApp } from "../../access-audit/src/app.js";
import { resetAuditStoreForTests } from "../../access-audit/src/store/index.js";

const validLawfulBody = {
  action: "message_read",
  legalRef: "2026-lawful-api-001",
  reasonCode: "court_order",
  reasonText: "Подробное обоснование служебного доступа с достаточным количеством символов для прохождения валидации платформы.".padEnd(120, "."),
  scope: {
    chatId: "550e8400-e29b-41d4-a716-446655440000",
    messageIds: ["6ba7b810-9dad-11d1-80b4-00c04fd43008"]
  },
  requester: { orgId: "mvd", officerId: "officer-1" }
};

test("POST /lawful/v1/operations accepts lawful principal and returns 202", async (t) => {
  resetAuditStoreForTests();
  process.env.LAWFUL_MTLS_REQUIRED = "false";
  process.env.LAWFUL_API_SHARED_SECRET = "test-lawful-secret";
  process.env.INTERNAL_SERVICE_SECRET = "test-internal";
  process.env.DEPLOYMENT_PROFILE = "public";
  process.env.LAWFUL_ACCESS_ENABLED = "true";

  const auditApp = createAccessAuditApp();
  const auditServer = auditApp.listen(0);
  const auditPort = (auditServer.address() as { port: number }).port;
  process.env.ACCESS_AUDIT_URL = `http://127.0.0.1:${auditPort}`;

  const lawfulApp = createLawfulAccessApp();
  const lawfulServer = lawfulApp.listen(0);

  t.after(() => {
    lawfulServer.close();
    auditServer.close();
  });

  const lawfulPort = (lawfulServer.address() as { port: number }).port;
  const base = `http://127.0.0.1:${lawfulPort}`;

  const unauthorized = await fetch(`${base}/lawful/v1/operations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validLawfulBody)
  });
  assert.equal(unauthorized.status, 401);

  const ok = await fetch(`${base}/lawful/v1/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lawful-api-secret": "test-lawful-secret"
    },
    body: JSON.stringify(validLawfulBody)
  });
  assert.equal(ok.status, 202);
  const body = (await ok.json()) as {
    privilegedOperationId: string;
    transparencyEventIds: string[];
    disclosureLevel: string;
  };
  assert.ok(body.privilegedOperationId);
  assert.equal(body.transparencyEventIds.length, 1);
  assert.equal(body.disclosureLevel, "partial");

  const duplicate = await fetch(`${base}/lawful/v1/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lawful-api-secret": "test-lawful-secret"
    },
    body: JSON.stringify(validLawfulBody)
  });
  assert.equal(duplicate.status, 409);
});

test("lawful routes return 403 when deployment profile is corporate", async (t) => {
  process.env.DEPLOYMENT_PROFILE = "corporate";
  process.env.LAWFUL_ACCESS_ENABLED = "false";
  const app = createLawfulAccessApp();
  const server = app.listen(0);
  t.after(() => server.close());

  const port = (server.address() as { port: number }).port;
  const response = await fetch(`http://127.0.0.1:${port}/lawful/v1/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lawful-api-secret": "any"
    },
    body: JSON.stringify(validLawfulBody)
  });
  assert.equal(response.status, 403);
});
