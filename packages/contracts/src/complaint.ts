export type ComplaintStatus =
  | "pending"
  | "upheld"
  | "rejected"
  | "referred_internal"
  | "operator_error_confirmed";

export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  "pending",
  "upheld",
  "rejected",
  "referred_internal",
  "operator_error_confirmed"
] as const;

export const MIN_COMPLAINT_BODY_LENGTH = 80;

export interface ComplaintRecord {
  id: string;
  eventId: string;
  userId: string;
  body: string;
  status: ComplaintStatus;
  outcomeSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintCreateInput {
  eventId: string;
  userId: string;
  body: string;
}
