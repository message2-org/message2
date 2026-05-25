import {
  COMPLAINT_STATUSES,
  type ComplaintCreateInput,
  type ComplaintRecord,
  type ComplaintStatus
} from "@message2/contracts";
import type { TransparencyEventV1 } from "@message2/contracts";
import { Prisma } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import {
  ComplaintValidationError,
  DuplicateComplaintError,
  validateComplaintCreate
} from "./complaints-validation.js";
import * as memoryComplaints from "./complaints-store-memory.js";
import { findAuditEventById } from "./store/index.js";

export { ComplaintValidationError, DuplicateComplaintError } from "./complaints-validation.js";
export { resetComplaintsForTests } from "./complaints-store-memory.js";

const rowToRecord = (row: {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  status: string;
  outcomeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ComplaintRecord => ({
  id: row.id,
  eventId: row.eventId,
  userId: row.userId,
  body: row.body,
  status: row.status as ComplaintStatus,
  outcomeSummary: row.outcomeSummary ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export const createComplaint = async (input: ComplaintCreateInput): Promise<ComplaintRecord> => {
  if (config.auditStore === "memory") {
    return memoryComplaints.memoryCreateComplaint(input);
  }

  const validated = validateComplaintCreate(input);
  const event = await findAuditEventById(validated.eventId);
  if (!event) {
    throw new ComplaintValidationError("eventId", "transparency event not found");
  }

  try {
    const row = await prisma.complaint.create({
      data: {
        eventId: validated.eventId,
        userId: validated.userId,
        body: validated.body,
        status: "pending"
      }
    });
    return rowToRecord(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateComplaintError();
    }
    throw error;
  }
};

export const findComplaintByEventAndUser = async (
  eventId: string,
  userId: string
): Promise<ComplaintRecord | null> => {
  if (config.auditStore === "memory") {
    return memoryComplaints.memoryFindComplaint(eventId, userId);
  }
  const row = await prisma.complaint.findUnique({
    where: { eventId_userId: { eventId, userId } }
  });
  return row ? rowToRecord(row) : null;
};

export const listComplaints = async (status?: ComplaintStatus): Promise<ComplaintRecord[]> => {
  if (config.auditStore === "memory") {
    return memoryComplaints.memoryListComplaints(status);
  }
  const rows = await prisma.complaint.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return rows.map(rowToRecord);
};

export const updateComplaintStatus = async (
  id: string,
  status: ComplaintStatus,
  outcomeSummary?: string
): Promise<ComplaintRecord | null> => {
  if (!COMPLAINT_STATUSES.includes(status)) {
    throw new ComplaintValidationError("status", "invalid status");
  }
  if (config.auditStore === "memory") {
    return memoryComplaints.memoryUpdateComplaint(id, status, outcomeSummary);
  }
  try {
    const row = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        outcomeSummary: outcomeSummary?.trim() || null
      }
    });
    return rowToRecord(row);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
};

export type PublicTransparencyEventView = {
  eventId: string;
  action: TransparencyEventV1["action"];
  scope: TransparencyEventV1["scope"];
  disclosureLevel: TransparencyEventV1["disclosureLevel"];
  summary: string;
  createdAt: string;
};

export const toPublicTransparencyView = (event: TransparencyEventV1): PublicTransparencyEventView => {
  const summary =
    event.disclosureLevel === "sealed"
      ? (event.userFacingSummary ??
        "Служебный доступ выполнен; подробности не раскрываются в соответствии с применимым правом.")
      : (event.userFacingSummary ?? `Категория: ${event.reasonCode}. Затронуты данные в указанном объёме.`);

  return {
    eventId: event.id,
    action: event.action,
    scope: event.scope,
    disclosureLevel: event.disclosureLevel,
    summary,
    createdAt: event.createdAt
  };
};

export const getPublicTransparencyEvent = async (eventId: string) => {
  const event = await findAuditEventById(eventId);
  if (!event) return null;
  return toPublicTransparencyView(event);
};
