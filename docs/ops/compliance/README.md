# Compliance operations (P6)

Templates and procedures for **public** and **corporate** deployments. Not legal advice — validate with counsel before production.

| Document | Use when |
|----------|----------|
| [lawful-access-response-runbook.md](./lawful-access-response-runbook.md) | Incoming lawful request via API or manual compliance queue |
| [complaint-handling-runbook.md](./complaint-handling-runbook.md) | User filed a transparency complaint (`Complaint` entity) |
| [siem-audit-forwarding-runbook.md](./siem-audit-forwarding-runbook.md) | Forwarding privileged audit + complaints to corporate SIEM |

## API (access-audit)

- `GET /admin/audit/export?format=ndjson|cef` — download for archival (admin JWT)
- `POST /admin/siem/forward` — push NDJSON batch to `SIEM_WEBHOOK_URL` (admin JWT)

Local: `pnpm dev:audit` and gateway `/access-audit/...`.
