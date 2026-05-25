# Runbook: lawful access request (template)

**Owner:** platform compliance  
**Applies to:** `DEPLOYMENT_PROFILE=public` only

## 1) Intake checklist

- [ ] Request received on mTLS lawful API or secure compliance channel
- [ ] `legalRef` present and matches format in counsel playbook
- [ ] `reasonCode` from platform taxonomy
- [ ] `reasonText` meets minimum length (see `@message2/contracts`)
- [ ] Scope is narrow (explicit chat/message/user IDs)

## 2) Validation

| Check | Action if failed |
|-------|------------------|
| Missing mandatory fields | Reject with `400 validation_failed` (do not execute) |
| Duplicate `legalRef` | `409 duplicate_legal_ref` — verify superseding document |
| Corporate cluster | Lawful API must be disabled — escalate misconfiguration |

## 3) Execution

1. Compliance officer reviews scope vs document.
2. Execute via `POST /lawful/v1/operations` (or internal admin path with same schema).
3. Confirm audit row in `privileged_audit_events` **before** user-visible effect.
4. Confirm affected users received transparency notice (public profile).

## 4) Post-incident

- [ ] Export audit slice: `GET /admin/audit/export?format=ndjson`
- [ ] Attach `privilegedOperationId` to ticket
- [ ] Retention per 149-FZ / 374-FZ counsel schedule (not hard-coded in app)

## 5) Escalation

- Scope too broad → refuse / return `403` with written rationale to requester
- E2EE plaintext unavailable → `422` per product policy; document in ticket
