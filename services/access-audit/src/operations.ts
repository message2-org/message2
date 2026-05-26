import type { PrivilegedOperationRequest, TransparencyEventV1 } from "@message2/contracts";
import { config } from "./config.js";
import { appendTransparencyEvent, DuplicateLegalRefError } from "./store/index.js";

export { DuplicateLegalRefError };

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

export type PrivilegedOperationResult = {
  privilegedOperationId: string;
  transparencyEvent: TransparencyEventV1;
  userNotification: {
    type: "transparency_notice";
    icon: string;
    message: string;
    eventId: string;
    disclosureLevel: TransparencyEventV1["disclosureLevel"];
  };
};

export const executePrivilegedOperation = async (
  operation: PrivilegedOperationRequest
): Promise<PrivilegedOperationResult> => {
  const event = await appendTransparencyEvent(operation, config.deploymentProfile);
  await propagateTransparency(event);

  return {
    privilegedOperationId: event.privilegedOperationId,
    transparencyEvent: event,
    userNotification: {
      type: "transparency_notice",
      icon: "shield-eye",
      message: "К затронутым данным был выполнен служебный доступ.",
      eventId: event.id,
      disclosureLevel: event.disclosureLevel
    }
  };
};
