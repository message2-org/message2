import cors from "cors";
import express from "express";
import helmet from "helmet";
import { lawfulApiBodyToOperation, validatePrivilegedOperationRequest } from "@message2/contracts";
import { config } from "./config.js";
import { requireLawfulApiEnabled, requireLawfulPrincipal } from "./auth.js";

export type LawfulAccessApp = express.Express;

const validationOptions = () => ({
  deploymentProfile: config.deploymentProfile,
  lawfulAccessEnabled: config.lawfulAccessEnabled
});

export const createLawfulAccessApp = (): LawfulAccessApp => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors());
  app.use(express.json());
  app.use(helmet());

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "lawful-access",
      deploymentProfile: config.deploymentProfile,
      lawfulAccessEnabled: config.lawfulAccessEnabled,
      mtlsRequired: config.mtlsRequired
    });
  });

  app.use("/lawful/v1", requireLawfulApiEnabled, requireLawfulPrincipal);

  app.post("/lawful/v1/operations", async (req, res) => {
    const mapped = lawfulApiBodyToOperation(req.body as Record<string, unknown>);
    const validated = validatePrivilegedOperationRequest(mapped, validationOptions());
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }

    const auditResponse = await fetch(`${config.accessAuditUrl}/internal/privileged/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": config.internalServiceSecret
      },
      body: JSON.stringify(validated.value)
    });

    const auditBody = (await auditResponse.json().catch(() => ({}))) as {
      error?: string;
      legalRef?: string;
      privilegedOperationId?: string;
      transparencyEvent?: { id: string; disclosureLevel: string };
      details?: unknown[];
    };

    if (auditResponse.status === 409) {
      res.status(409).json({ error: auditBody.error ?? "duplicate_legal_ref", legalRef: auditBody.legalRef });
      return;
    }
    if (auditResponse.status === 400) {
      res.status(400).json({ error: auditBody.error ?? "validation_failed", details: auditBody.details });
      return;
    }
    if (!auditResponse.ok) {
      res.status(502).json({ error: "audit_service_failed", status: auditResponse.status });
      return;
    }

    res.status(202).json({
      privilegedOperationId: auditBody.privilegedOperationId,
      transparencyEventIds: auditBody.transparencyEvent ? [auditBody.transparencyEvent.id] : [],
      disclosureLevel: auditBody.transparencyEvent?.disclosureLevel ?? validated.value.disclosureLevel ?? "partial"
    });
  });

  return app;
};
