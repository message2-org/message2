# Runbook: SIEM audit forwarding (template)

**Applies to:** corporate and public operators who forward compliance logs to SIEM

## Environment

```bash
# access-audit .env
SIEM_WEBHOOK_URL=https://siem-collector.example.com/ingest/message2
SIEM_EXPORT_MAX_RECORDS=1000
```

## Manual forward (on demand)

```bash
curl -sS -X POST http://localhost:4000/access-audit/admin/siem/forward \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Scheduled export (example)

Use `infra/observability/audit-export-cron.example.sh` with cron or systemd timer.

## Download for archival

```bash
curl -sS "http://localhost:4000/access-audit/admin/audit/export?format=ndjson" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o message2-audit-$(date -u +%Y%m%d).ndjson
```

## Record format (NDJSON)

Each line:

```json
{"type":"privileged_audit","exportedAt":"…","payload":{…}}
{"type":"complaint","exportedAt":"…","payload":{…}}
```

Map fields in SIEM to your correlation rules (`legalRef`, `privilegedOperationId`, `eventId`).

## Corporate note

Lawful **external** API is off on `DEPLOYMENT_PROFILE=corporate`; SIEM still receives **internal** privileged actions and complaints if enabled.
