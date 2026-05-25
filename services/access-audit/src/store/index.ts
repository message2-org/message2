import type { PrivilegedOperationRequest, TransparencyEventV1 } from "@message2/contracts";
import type { DeploymentProfile } from "@message2/contracts";
import { config } from "../config.js";
import * as memoryStore from "./memory.js";
import * as postgresStore from "./postgres.js";

export { DuplicateLegalRefError } from "./errors.js";

export const resetAuditStoreForTests = () => {
  if (config.auditStore !== "memory") {
    throw new Error("resetAuditStoreForTests is only supported with AUDIT_STORE=memory");
  }
  memoryStore.resetAuditStoreForTests();
};

export const appendTransparencyEvent = async (
  request: PrivilegedOperationRequest,
  deploymentProfile: DeploymentProfile
): Promise<TransparencyEventV1> => {
  if (config.auditStore === "postgres") {
    return postgresStore.appendTransparencyEvent(request, deploymentProfile);
  }
  return memoryStore.appendTransparencyEvent(request, deploymentProfile);
};

export const listAuditEvents = async (): Promise<TransparencyEventV1[]> => {
  if (config.auditStore === "postgres") {
    return postgresStore.listAuditEvents();
  }
  return memoryStore.listAuditEvents();
};

export const findAuditEventById = async (eventId: string): Promise<TransparencyEventV1 | null> => {
  if (config.auditStore === "postgres") {
    return postgresStore.findAuditEventById(eventId);
  }
  return memoryStore.findAuditEventById(eventId);
};
