import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import {
  legacyReadBodyToOperation,
  validatePrivilegedOperationRequest,
  type PrivilegedOperationRequest,
  type TransparencyEventV1
} from "@message2/contracts";
import { config } from "./config.js";
import { appendTransparencyEvent, listAuditEvents } from "./store.js";

type AuthPayload = { sub: string; role?: string };

export type AccessAuditApp = express.Express;

const requireAuditorRole = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "admin role required" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
};

const validationOptions = () => ({
  deploymentProfile: config.deploymentProfile,
  lawfulAccessEnabled: config.lawfulAccessEnabled
});

const propagateTransparency = async (event: TransparencyEventV1) => {
  try {
    const response = await fetch(`${config.messagingUrl}/internal/transparency`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": config.internalServiceSecret
      },
      body: JSON.stringify({
        id: event.id,
        action: event.action,
        scope: event.scope,
        reasonCode: event.reasonCode,
        legalRef: event.legalRef,
        disclosureLevel: event.disclosureLevel,
        userFacingSummary: event.userFacingSummary,
        privilegedOperationId: event.privilegedOperationId,
        createdAt: event.createdAt
      })
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn("[access-audit] messaging transparency failed", response.status, text);
    }
  } catch (error) {
    console.warn("[access-audit] messaging transparency failed", error);
  }

  try {
    await fetch(`${config.notificationsUrl}/notifications/transparency`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        action: event.action,
        scope: event.scope,
        disclosureLevel: event.disclosureLevel,
        privilegedOperationId: event.privilegedOperationId
      })
    });
  } catch (error) {
    console.warn("[access-audit] transparency notify failed", error);
  }
};

const executePrivilegedOperation = async (
  req: express.Request,
  res: express.Response,
  operation: PrivilegedOperationRequest
) => {
  const event = appendTransparencyEvent(operation, config.deploymentProfile);
  await propagateTransparency(event);

  res.status(201).json({
    privilegedOperationId: event.privilegedOperationId,
    transparencyEvent: event,
    userNotification: {
      type: "transparency_notice",
      icon: "shield-eye",
      message: "К затронутым данным был выполнен служебный доступ.",
      eventId: event.id,
      disclosureLevel: event.disclosureLevel
    }
  });
};

export const createAccessAuditApp = (): AccessAuditApp => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(helmet());

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "access-audit",
      deploymentProfile: config.deploymentProfile,
      lawfulAccessEnabled: config.lawfulAccessEnabled
    });
  });

  app.post("/privileged/operations", requireAuditorRole, async (req, res) => {
    const validated = validatePrivilegedOperationRequest(req.body, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    await executePrivilegedOperation(req, res, validated.value);
  });

  app.post("/privileged/read", requireAuditorRole, async (req, res) => {
    const mapped = legacyReadBodyToOperation(req.body as Record<string, unknown>);
    const validated = validatePrivilegedOperationRequest(mapped, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    await executePrivilegedOperation(req, res, validated.value);
  });

  app.get("/audit/events", requireAuditorRole, (_req, res) => {
    res.json(listAuditEvents());
  });

  return app;
};
