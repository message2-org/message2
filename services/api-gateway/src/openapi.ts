import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function loadOpenApiSpec(): Record<string, unknown> {
  const specPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../docs/openapi/message2-api.openapi.json"
  );
  return JSON.parse(readFileSync(specPath, "utf8")) as Record<string, unknown>;
}
