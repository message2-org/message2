import { randomUUID } from "node:crypto";
import type { PrivilegedOperationRequest, TransparencyEventV1 } from "@message2/contracts";
import type { DeploymentProfile } from "@message2/contracts";
import { DuplicateLegalRefError } from "./errors.js";

const events: TransparencyEventV1[] = [];

export const appendTransparencyEvent = (
  request: PrivilegedOperationRequest,
  deploymentProfile: DeploymentProfile
): TransparencyEventV1 => {
  if (events.some((event) => event.legalRef === request.legalRef)) {
    throw new DuplicateLegalRefError(request.legalRef);
  }
  const event: TransparencyEventV1 = {
    id: randomUUID(),
    deploymentProfile,
    action: request.action,
    scope: request.scope,
    reasonCode: request.reasonCode,
    reasonText: request.reasonText,
    legalRef: request.legalRef,
    disclosureLevel: request.disclosureLevel ?? "partial",
    userFacingSummary: request.userFacingSummary,
    actor: request.actor ?? "internal_admin",
    privilegedOperationId: randomUUID(),
    createdAt: new Date().toISOString()
  };
  events.push(event);
  return event;
};

export const listAuditEvents = (): TransparencyEventV1[] => [...events];

export const findAuditEventById = (eventId: string): TransparencyEventV1 | null =>
  events.find((event) => event.id === eventId) ?? null;

export const resetAuditStoreForTests = () => {
  events.length = 0;
};
