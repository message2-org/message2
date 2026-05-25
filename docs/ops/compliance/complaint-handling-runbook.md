# Runbook: user transparency complaint (template)

**Owner:** platform compliance ombudsman  
**SLA target:** 30 calendar days (product constant; adjust per policy)

## 1) Intake

- Source: `Complaint` entity linked to `eventId`
- User must have received `TransparencyUserNotice` for that event (public profile)

## 2) Review steps

1. Load audit event by `eventId` (admin audit export or DB).
2. Verify `legalRef`, `reasonCode`, `reasonText` consistency.
3. Confirm action matched approved scope (chat/message IDs).
4. Record outcome in admin console: `PATCH /complaints/:id`

| Outcome | When |
|---------|------|
| `upheld` | Procedure followed; user concern addressed in policy terms |
| `rejected` | Request was lawful and within scope |
| `referred_internal` | Needs legal/engineering review |
| `operator_error_confirmed` | Platform error; log corrective action |

## 3) User communication

- Provide **sanitized** `outcomeSummary` only — no investigation secrets
- Do **not** restore deleted content if removal was legally valid

## 4) Closure

- [ ] Complaint status updated
- [ ] Optional SIEM export row includes complaint record
- [ ] Ticket archived with `privilegedOperationId` reference
