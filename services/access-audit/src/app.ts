import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import {
  COMPLAINT_STATUSES,
  legacyReadBodyToOperation,
  validatePrivilegedOperationRequest,
  type ComplaintStatus,
  type PrivilegedOperationRequest
} from "@message2/contracts";
import { config } from "./config.js";
import { requireUserTransparencyFeature } from "./profile-guards.js";
import {
  createComplaint,
  findComplaintByEventAndUser,
  getPublicTransparencyEvent,
  listComplaints,
  updateComplaintStatus,
  ComplaintValidationError,
  DuplicateComplaintError
} from "./complaints.js";
import { executePrivilegedOperation, DuplicateLegalRefError } from "./operations.js";
import { findAuditEventById, listAuditEvents } from "./store/index.js";
import { buildSiemExportRecords, toCef, toNdjson } from "./siem-export.js";
import { forwardToSiemWebhook } from "./siem-forward.js";

type AuthPayload = { sub: string; role?: string };

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export type AccessAuditApp = express.Express;

const readBearerPayload = (req: express.Request): AuthPayload | null => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
};

const requireAuditorRole = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const payload = readBearerPayload(req);
  if (!payload) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  if (payload.role !== "admin") {
    res.status(403).json({ error: "admin role required" });
    return;
  }
  (req as express.Request & { auth: AuthPayload }).auth = payload;
  next();
};

const requireUserAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const payload = readBearerPayload(req);
  if (!payload?.sub) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  (req as express.Request & { auth: AuthPayload }).auth = payload;
  next();
};

const requireInternalSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = req.header("x-internal-secret") ?? "";
  if (!secret || secret !== config.internalServiceSecret) {
    res.status(401).json({ error: "invalid internal secret" });
    return;
  }
  next();
};

const validationOptions = () => ({
  deploymentProfile: config.deploymentProfile,
  lawfulAccessEnabled: config.lawfulAccessEnabled
});

const handlePrivilegedOperation = async (
  res: express.Response,
  operation: PrivilegedOperationRequest
) => {
  try {
    const result = await executePrivilegedOperation(operation);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof DuplicateLegalRefError) {
      res.status(409).json({ error: "duplicate_legal_ref", legalRef: error.legalRef });
      return;
    }
    throw error;
  }
};

const handleComplaintError = (res: express.Response, error: unknown) => {
  if (error instanceof ComplaintValidationError) {
    res.status(400).json({ error: "validation_failed", field: error.field, message: error.message });
    return true;
  }
  if (error instanceof DuplicateComplaintError) {
    res.status(409).json({ error: "duplicate_complaint" });
    return true;
  }
  return false;
};

export const createAccessAuditApp = (): AccessAuditApp => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(helmet());

  app.get("/health", async (_req, res) => {
    let dbOk = config.auditStore === "memory";
    if (config.auditStore === "postgres") {
      try {
        const { prisma } = await import("./prisma.js");
        await prisma.$queryRaw`SELECT 1`;
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }
    res.status(dbOk ? 200 : 503).json({
      ok: dbOk,
      service: "access-audit",
      deploymentProfile: config.deploymentProfile,
      lawfulAccessEnabled: config.lawfulAccessEnabled,
      auditStore: config.auditStore,
      corporateConnectivity: config.corporateConnectivity,
      userTransparencyEnabled: config.userTransparencyEnabled,
      siemWebhookConfigured: Boolean(config.siemWebhookUrl)
    });
  });

  app.post("/internal/privileged/operations", requireInternalSecret, async (req, res) => {
    const body = { ...(req.body as Record<string, unknown>), actor: "lawful_api" };
    const validated = validatePrivilegedOperationRequest(body, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    await handlePrivilegedOperation(res, validated.value);
  });

  app.post("/internal/complaints", requireInternalSecret, async (req, res) => {
    try {
      const body = req.body as { eventId?: string; userId?: string; body?: string };
      const complaint = await createComplaint({
        eventId: body.eventId ?? "",
        userId: body.userId ?? "",
        body: body.body ?? ""
      });
      res.status(201).json(complaint);
    } catch (error) {
      if (handleComplaintError(res, error)) return;
      throw error;
    }
  });

  app.get("/internal/complaints/lookup", requireInternalSecret, async (req, res) => {
    const eventId = String(req.query.eventId ?? "");
    const userId = String(req.query.userId ?? "");
    const complaint = await findComplaintByEventAndUser(eventId, userId);
    res.json({ complaint });
  });

  app.get("/internal/transparency/:eventId", requireInternalSecret, async (req, res) => {
    const eventId = routeParam(req.params.eventId);
    if (!eventId) {
      res.status(400).json({ error: "invalid_event_id" });
      return;
    }
    const event = await getPublicTransparencyEvent(eventId);
    if (!event) {
      res.status(404).json({ error: "event_not_found" });
      return;
    }
    res.json(event);
  });

  app.post("/privileged/operations", requireAuditorRole, async (req, res) => {
    const validated = validatePrivilegedOperationRequest(req.body, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    await handlePrivilegedOperation(res, validated.value);
  });

  app.post("/privileged/read", requireAuditorRole, async (req, res) => {
    const mapped = legacyReadBodyToOperation(req.body as Record<string, unknown>);
    const validated = validatePrivilegedOperationRequest(mapped, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    await handlePrivilegedOperation(res, validated.value);
  });

  app.get("/audit/events", requireAuditorRole, async (_req, res) => {
    res.json(await listAuditEvents());
  });

  app.get("/admin/audit/export", requireAuditorRole, async (req, res) => {
    const format = req.query.format === "cef" ? "cef" : "ndjson";
    const events = (await listAuditEvents()).slice(0, config.siemExportMaxRecords);
    const complaints = (await listComplaints()).slice(0, config.siemExportMaxRecords);
    const records = buildSiemExportRecords(events, complaints);
    const body = format === "cef" ? toCef(records) : toNdjson(records);
    res.setHeader("content-type", format === "cef" ? "text/plain; charset=utf-8" : "application/x-ndjson");
    res.setHeader("content-disposition", `attachment; filename="message2-audit-export.${format === "cef" ? "cef" : "ndjson"}"`);
    res.send(body);
  });

  app.post("/admin/siem/forward", requireAuditorRole, async (_req, res) => {
    if (!config.siemWebhookUrl) {
      res.status(503).json({ error: "siem_webhook_not_configured" });
      return;
    }
    const events = (await listAuditEvents()).slice(0, config.siemExportMaxRecords);
    const complaints = (await listComplaints()).slice(0, config.siemExportMaxRecords);
    const result = await forwardToSiemWebhook(events, complaints, config.siemWebhookUrl);
    if (!result.ok) {
      res.status(502).json({ error: result.error });
      return;
    }
    res.json({
      ok: true,
      forwardedAuditEvents: events.length,
      forwardedComplaints: complaints.length,
      httpStatus: result.status
    });
  });

  app.get("/complaints", requireAuditorRole, async (req, res) => {
    const statusRaw = req.query.status;
    const status =
      typeof statusRaw === "string" && COMPLAINT_STATUSES.includes(statusRaw as ComplaintStatus)
        ? (statusRaw as ComplaintStatus)
        : undefined;
    res.json(await listComplaints(status));
  });

  app.patch("/complaints/:id", requireAuditorRole, async (req, res) => {
    try {
      const body = req.body as { status?: ComplaintStatus; outcomeSummary?: string };
      if (!body.status) {
        res.status(400).json({ error: "status_required" });
        return;
      }
      const complaintId = routeParam(req.params.id);
      if (!complaintId) {
        res.status(400).json({ error: "invalid_complaint_id" });
        return;
      }
      const updated = await updateComplaintStatus(complaintId, body.status, body.outcomeSummary);
      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      if (handleComplaintError(res, error)) return;
      throw error;
    }
  });

  app.get("/transparency/events/:eventId", requireUserAuth, requireUserTransparencyFeature, async (req, res) => {
    const eventId = routeParam(req.params.eventId);
    if (!eventId) {
      res.status(400).json({ error: "invalid_event_id" });
      return;
    }
    const event = await getPublicTransparencyEvent(eventId);
    if (!event) {
      res.status(404).json({ error: "event_not_found" });
      return;
    }
    const auth = (req as express.Request & { auth: AuthPayload }).auth;
    const complaint = await findComplaintByEventAndUser(event.eventId, auth.sub);
    res.json({ event, complaint });
  });

  return app;
};
