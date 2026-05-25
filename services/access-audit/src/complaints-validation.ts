import { MIN_COMPLAINT_BODY_LENGTH, type ComplaintCreateInput } from "@message2/contracts";

export class ComplaintValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ComplaintValidationError";
    this.field = field;
  }
}

export class DuplicateComplaintError extends Error {
  constructor() {
    super("complaint already exists for this event");
    this.name = "DuplicateComplaintError";
  }
}

export const validateComplaintCreate = (input: ComplaintCreateInput) => {
  if (!input.eventId?.trim()) {
    throw new ComplaintValidationError("eventId", "eventId is required");
  }
  if (!input.userId?.trim()) {
    throw new ComplaintValidationError("userId", "userId is required");
  }
  const body = input.body?.trim() ?? "";
  if (body.length < MIN_COMPLAINT_BODY_LENGTH) {
    throw new ComplaintValidationError(
      "body",
      `body must be at least ${MIN_COMPLAINT_BODY_LENGTH} characters`
    );
  }
  return { eventId: input.eventId.trim(), userId: input.userId.trim(), body };
};
