import type { ComplaintRecord, TransparencyEventV1 } from "@message2/contracts";
import { buildSiemExportRecords } from "./siem-export.js";

export const forwardToSiemWebhook = async (
  events: TransparencyEventV1[],
  complaints: ComplaintRecord[],
  webhookUrl: string
): Promise<{ ok: true; status: number } | { ok: false; error: string }> => {
  const records = buildSiemExportRecords(events, complaints);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/x-ndjson" },
      body: records.map((record) => JSON.stringify(record)).join("\n")
    });
    if (!response.ok) {
      return { ok: false, error: `siem_http_${response.status}` };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "siem_forward_failed" };
  }
};
