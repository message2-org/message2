import type { ComplaintRecord, TransparencyEventV1 } from "@message2/contracts";

export type SiemRecordType = "privileged_audit" | "complaint";

export type SiemExportRecord = {
  type: SiemRecordType;
  exportedAt: string;
  payload: TransparencyEventV1 | ComplaintRecord;
};

export const toNdjson = (records: SiemExportRecord[]): string =>
  records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");

const cefEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

export const toCef = (records: SiemExportRecord[]): string =>
  records
    .map((record) => {
      const extension =
        record.type === "privileged_audit"
          ? `act=${cefEscape((record.payload as TransparencyEventV1).action)} legalRef=${cefEscape((record.payload as TransparencyEventV1).legalRef)}`
          : `status=${cefEscape((record.payload as ComplaintRecord).status)} eventId=${cefEscape((record.payload as ComplaintRecord).eventId)}`;
      return `CEF:0|Message2|access-audit|1.0|${record.type}|${record.type}|5|msg=${cefEscape(record.type)} ${extension}`;
    })
    .join("\n") + (records.length ? "\n" : "");

export const buildSiemExportRecords = (
  events: TransparencyEventV1[],
  complaints: ComplaintRecord[]
): SiemExportRecord[] => {
  const exportedAt = new Date().toISOString();
  return [
    ...events.map((payload) => ({ type: "privileged_audit" as const, exportedAt, payload })),
    ...complaints.map((payload) => ({ type: "complaint" as const, exportedAt, payload }))
  ];
};
