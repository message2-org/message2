import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PrivilegedOperationRequest, TransparencyEventV1, PrivilegedScope } from "@message2/contracts";
import type { DeploymentProfile } from "@message2/contracts";
import { prisma } from "../prisma.js";
import { DuplicateLegalRefError } from "./errors.js";

const rowToEvent = (row: {
  id: string;
  deploymentProfile: string;
  action: string;
  scopeJson: unknown;
  reasonCode: string;
  reasonText: string;
  legalRef: string;
  disclosureLevel: string;
  userFacingSummary: string | null;
  actor: string;
  privilegedOperationId: string;
  createdAt: Date;
}): TransparencyEventV1 => ({
  id: row.id,
  deploymentProfile: row.deploymentProfile as DeploymentProfile,
  action: row.action as TransparencyEventV1["action"],
  scope: row.scopeJson as PrivilegedScope,
  reasonCode: row.reasonCode,
  reasonText: row.reasonText,
  legalRef: row.legalRef,
  disclosureLevel: row.disclosureLevel as TransparencyEventV1["disclosureLevel"],
  userFacingSummary: row.userFacingSummary ?? undefined,
  actor: row.actor as TransparencyEventV1["actor"],
  privilegedOperationId: row.privilegedOperationId,
  createdAt: row.createdAt.toISOString()
});

export const appendTransparencyEvent = async (
  request: PrivilegedOperationRequest,
  deploymentProfile: DeploymentProfile
): Promise<TransparencyEventV1> => {
  const privilegedOperationId = randomUUID();
  const id = randomUUID();

  try {
    const row = await prisma.privilegedAuditEvent.create({
      data: {
        id,
        deploymentProfile,
        action: request.action,
        scopeJson: request.scope as Prisma.InputJsonValue,
        reasonCode: request.reasonCode,
        reasonText: request.reasonText,
        legalRef: request.legalRef,
        disclosureLevel: request.disclosureLevel ?? "partial",
        userFacingSummary: request.userFacingSummary,
        actor: request.actor ?? "internal_admin",
        privilegedOperationId
      }
    });
    return rowToEvent(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateLegalRefError(request.legalRef);
    }
    throw error;
  }
};

export const listAuditEvents = async (): Promise<TransparencyEventV1[]> => {
  const rows = await prisma.privilegedAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 500
  });
  return rows.map(rowToEvent);
};

export const findAuditEventById = async (eventId: string): Promise<TransparencyEventV1 | null> => {
  const row = await prisma.privilegedAuditEvent.findUnique({ where: { id: eventId } });
  return row ? rowToEvent(row) : null;
};
