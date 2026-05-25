import test from "node:test";
import assert from "node:assert/strict";
import { buildSiemExportRecords, toCef, toNdjson } from "./siem-export.js";

test("siem export formats", () => {
  const records = buildSiemExportRecords(
    [
      {
        id: "evt-1",
        deploymentProfile: "public",
        action: "message_read",
        scope: { chatIds: ["550e8400-e29b-41d4-a716-446655440000"] },
        reasonCode: "court_order",
        reasonText: "x".repeat(120),
        legalRef: "legal-1",
        disclosureLevel: "partial",
        actor: "lawful_api",
        privilegedOperationId: "op-1",
        createdAt: "2026-05-25T12:00:00.000Z"
      }
    ],
    [
      {
        id: "cmp-1",
        eventId: "evt-1",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        body: "y".repeat(80),
        status: "pending",
        createdAt: "2026-05-25T12:01:00.000Z",
        updatedAt: "2026-05-25T12:01:00.000Z"
      }
    ]
  );
  assert.equal(records.length, 2);
  const ndjson = toNdjson(records);
  assert.ok(ndjson.includes("privileged_audit"));
  assert.ok(ndjson.includes("complaint"));
  const cef = toCef(records);
  assert.ok(cef.includes("CEF:0|Message2|access-audit"));
});
