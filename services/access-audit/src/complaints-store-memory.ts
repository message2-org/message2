import { randomUUID } from "node:crypto";
import type { ComplaintCreateInput, ComplaintRecord, ComplaintStatus } from "@message2/contracts";
import { ComplaintValidationError, DuplicateComplaintError, validateComplaintCreate } from "./complaints-validation.js";
import { findAuditEventById } from "./store/memory.js";

const complaints: ComplaintRecord[] = [];

export const memoryCreateComplaint = async (input: ComplaintCreateInput): Promise<ComplaintRecord> => {
  const validated = validateComplaintCreate(input);
  const event = findAuditEventById(validated.eventId);
  if (!event) {
    throw new ComplaintValidationError("eventId", "transparency event not found");
  }
  if (complaints.some((row) => row.eventId === validated.eventId && row.userId === validated.userId)) {
    throw new DuplicateComplaintError();
  }
  const now = new Date().toISOString();
  const record: ComplaintRecord = {
    id: randomUUID(),
    eventId: validated.eventId,
    userId: validated.userId,
    body: validated.body,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  complaints.push(record);
  return record;
};

export const memoryFindComplaint = (eventId: string, userId: string) =>
  complaints.find((row) => row.eventId === eventId && row.userId === userId) ?? null;

export const memoryListComplaints = (status?: ComplaintStatus) =>
  complaints
    .filter((row) => (status ? row.status === status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const memoryUpdateComplaint = (
  id: string,
  status: ComplaintStatus,
  outcomeSummary?: string
): ComplaintRecord | null => {
  const index = complaints.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const updated: ComplaintRecord = {
    ...complaints[index]!,
    status,
    outcomeSummary: outcomeSummary?.trim() || undefined,
    updatedAt: new Date().toISOString()
  };
  complaints[index] = updated;
  return updated;
};

export const resetComplaintsForTests = () => {
  complaints.length = 0;
};
