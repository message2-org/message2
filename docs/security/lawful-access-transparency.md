# Lawful access, transparency, and operator compliance (public profile)

> **Disclaimer.** This document describes product and engineering policy for Message2. It is **not legal advice**. Before a production public deployment in the Russian Federation, validate obligations, retention periods, and disclosure limits with qualified counsel. Legal norms change; the references below are indicative as of **2026-05**.

## 1) Purpose and scope

This document defines:

- how the **public** deployment profile interacts with lawful requests from authorized state bodies;
- what the **operator** (platform owner) may require from requesters before executing access or modification;
- what must be shown to **end users** (transparency) and what may remain sealed;
- how this differs from the **corporate** profile (no external lawful API; maximum confidentiality);
- an implementation map to existing services (`access-audit`, `notifications`, `messaging`, future `lawful-access` gateway).

Corporate profile: see [deployment-profiles.md](../ops/deployment-profiles.md) — privileged actions are **internal only** (org admin / compliance), forwarded to SIEM, without user-facing “state access” badges unless the customer enables internal transparency.

---

## 2) Legal references (indicative, not exhaustive)

| Norm | Topic (summary) | Relevance to Message2 (public) |
|------|-----------------|--------------------------------|
| [149-FZ](http://pravo.gov.ru) «Об информации…» | Information dissemination; **ORI** (organizer of information dissemination) duties; restrictions | Registration as ORI if applicable; blocking/limiting dissemination; interaction with authorized bodies |
| [374-FZ](http://pravo.gov.ru) (amendments often called «Яровая») | Storage of communications metadata/content per regulated procedures; interaction with authorities | Retention architecture, technical means for lawful requests (with subordinate acts) |
| [152-FZ](http://pravo.gov.ru) | Personal data | Lawful basis for processing; limits on notifying the data subject; privacy policy texts |
| [114-FZ](http://pravo.gov.ru) | Counter-terrorism | Grounds for certain restrictive measures (as **legal basis types** in `legalRef`, not as product features) |
| Subordinate acts to 149-FZ / 374-FZ | ORI register, formats, timelines | **Do not hard-code** numbers in code; maintain an external compliance runbook linked from Admin Console |

**Important distinction (three layers):**

| Layer | Who | Typical obligation |
|-------|-----|-------------------|
| A. State ↔ **Operator** | Court order, mandated request to ORI | Operator must execute **if** the request is valid and within scope |
| B. **Operator policy** (this document) | Your lawful API / compliance team | Structured request, `legalRef`, reason taxonomy, audit before execution |
| C. Operator ↔ **User** | Transparency UI | Inform about **fact** and **scope** of impact; **full** textual reason from authorities only when law and investigation regime allow (`disclosureLevel`) |

Layer B can be **stricter** than minimal legal minimum (good for trust and audit). Layer C cannot promise full disclosure in all cases without legal review.

---

## 3) Deployment profile matrix

| Capability | `DEPLOYMENT_PROFILE=public` | `DEPLOYMENT_PROFILE=corporate` |
|------------|------------------------------|--------------------------------|
| External lawful-access API | Enabled (isolated service, mTLS) | **Disabled** (service not started) |
| Mandatory `reasonCode` + `reasonText` + `legalRef` | Yes — API returns `400` otherwise | N/A (internal actions use same schema for consistency) |
| User transparency (badge, in-app notice) | Mandatory for affected users | Optional / internal-only per customer policy |
| User can disable in-app transparency | **No** (public) | N/A |
| User complaint (“оспорить”) | To **platform compliance**, linked to `eventId` | To org admin / compliance per customer policy |
| Default message encryption | Hybrid (see [e2ee-design.md](./e2ee-design.md) § Public encryption modes) | **Admin choice** (`metadata_only` … `e2ee_strict`), no forced maximum |
| Instance connectivity | N/A (single public operator) | `isolated` / `federation` / `public_bridge` (see [deployment-profiles.md](../ops/deployment-profiles.md)) |
| Tombstones after privileged delete | Yes | Only for internal admin deletes (if customer enables) |

Environment flag (recommended): `DEPLOYMENT_PROFILE=public|corporate`, `LAWFUL_ACCESS_ENABLED=true|false` (forced `false` when corporate).

---

## 4) What the operator may require from authorities (your rights)

When acting as ORI / telecommunications or information platform operator, you generally **may and should** insist on the following **before** automated execution via the lawful API:

| # | Requirement | Rationale |
|---|-------------|-----------|
| 1 | **Formal legal basis** — type + document number (`legalRef`) | Audit, disputes, regulator inspection |
| 2 | **Narrow scope** — explicit `chatId`, `messageIds`, `userId`, or bounded time range | Prevents “fishing expedition” through your API |
| 3 | **Stated action** — read / export / restrict / delete (from fixed enum) | Least privilege |
| 4 | **Reason taxonomy** — `reasonCode` from platform dictionary | Statistics, consistency |
| 5 | **Detailed justification** — `reasonText` (min length enforced, e.g. ≥ 120 chars) | Replaces “silent” deletes like in consumer messengers |
| 6 | **Requester identity** — org id, officer id (stored in audit, not necessarily shown to user) | Accountability |
| 7 | **Cryptographic channel** — mTLS client cert, IP allowlist, dedicated credentials | Separation from user/admin JWT |

**You may refuse or escalate (compliance review, not automatic execution) when:**

- any mandatory field is missing or scope is “all users” / “all chats” without legal authority for bulk export;
- `legalRef` is absent or clearly invalid;
- requested action exceeds stored data (e.g. plaintext message bodies when only E2EE ciphertext exists — see §7);
- request duplicates an already executed `legalRef` without superseding document;
- technical impossibility (see §7).

Refusal must be **logged** with reason; authorities receive a machine-readable error code, not silent failure.

**What you generally cannot do** (as operator policy — final word belongs to counsel):

- Unilaterally **ignore** a **valid** court decision or lawful mandated order because the user prefers privacy — risk of liability for the **operator**, not a substitute for challenging the order in court;
- **Publish** classified investigation details to the user because they asked — conflict with secrecy of investigation;
- Use the complaint button as “appeal to FSB” — route only to **platform compliance** (§9).

---

## 5) Platform policy: no silent privileged actions (public)

For every privileged **read**, **export**, **restrict**, or **delete** via the lawful contour:

1. Validate payload (schema + scope + min `reasonText`).
2. **Append** immutable audit record (`access-audit`) **before** or in the same transaction as the side effect.
3. Execute the action in `messaging` / `media` with a `privilegedOperationId`.
4. Create **tombstones** for deleted entities (metadata survives deletion in compliance store).
5. Emit **transparency** events → `notifications` → WebSocket + mandatory in-app UI.
6. Optional push only if user preferences allow **non-mandatory** channels; in-app record is never skipped on public profile.

**Reject** with `400` / `422` if `reasonCode`, `reasonText`, or `legalRef` is missing — **no execution**.

Internal **instance admins** must use the same schema (no backdoor UI without audit). Emergency “break-glass” still writes audit with `actor=break_glass_admin`.

---

## 6) Transparency and disclosure to users

### 6.1 Event model (extends `TransparencyEvent` in `@message2/contracts`)

```ts
type PrivilegedAction =
  | "message_read"
  | "message_export"
  | "account_restrict"
  | "account_delete"
  | "chat_delete"
  | "channel_delete"
  | "message_delete"
  | "metadata_query";

type DisclosureLevel = "full" | "partial" | "sealed";

interface TransparencyEvent {
  id: string;
  deploymentProfile: "public";
  action: PrivilegedAction;
  scope: {
    userIds?: string[];
    chatIds?: string[];
    messageIds?: string[];
    channelIds?: string[];
  };
  reasonCode: string;       // platform taxonomy
  reasonText: string;       // full text stored in audit
  legalRef: string;         // court/order id
  disclosureLevel: DisclosureLevel;
  userFacingSummary?: string; // sanitized text for UI when not sealed
  actor: "lawful_api" | "internal_admin" | "break_glass_admin";
  privilegedOperationId: string;
  createdAt: string;        // ISO-8601
}
```

### 6.2 User-visible behavior

| `disclosureLevel` | User sees |
|-------------------|-----------|
| `full` | Taxonomy label + `userFacingSummary` (sanitized) + exact scope (which chats/messages/account parts) |
| `partial` | Scope + generic category (“counter-terrorism”, “court order”) without operational detail |
| `sealed` | “Access/removal per lawful request; details not disclosed to users under applicable law” + scope where possible |

**UI (public client):**

- In-app notice (mandatory) + optional push.
- Per-message badge (e.g. shield / “reviewed by third party” icon) for `message_read` / `message_delete`.
- Tombstone row for deleted content: who/when/what type, not necessarily plaintext.

### 6.3 After deletion

Users can open **Transparency detail** by `eventId`:

- what entity types were affected;
- timestamps;
- `disclosureLevel` and available summary;
- button **“Submit complaint”** (§9).

---

## 7) Encryption modes vs lawful access (public)

Align with [e2ee-design.md](./e2ee-design.md):

| Mode | Server has | Lawful API can return |
|------|------------|------------------------|
| `e2ee_strict` | Ciphertext + metadata | Metadata; ciphertext blobs; **not** plaintext without client keys |
| `server_encrypted` (public default for “normal” chats) | Encrypted at rest with server keys | Plaintext after key unwrap inside **secure enclave** / HSM-backed service — still audited |
| `metadata_only` | Same as strict for content | Membership, timestamps, delivery |

**Corporate**: encryption defaults are **admin-configurable** (up to `e2ee_strict`); lawful external API off.

DM downgrade from stricter to weaker mode: **both participants** must confirm in client; instance policy sets a **ceiling** (public may forbid `e2ee_strict` for new chats only if disclosed at registration — product/legal choice).

---

## 8) Storage: audit, tombstones, duplication

**Do not** mirror the entire database to a “second server for authorities.”

| Store | Contents | Mutable? |
|-------|----------|----------|
| Operational DB | Live chats, ciphertext, media refs | Yes (normal CRUD) |
| `audit_events` (append-only) | Full `reasonText`, `legalRef`, requester ids, scope, hashes | **No** update/delete via API |
| `transparency_tombstones` | Deleted entity metadata for user UI | Insert-only |
| Backups | DR only | Encrypted, same retention policy |

Retention periods: defined in compliance runbook per 149-FZ / 374-FZ and 152-FZ — **not** hard-coded in application code except defaults with override via env.

---

## 9) User complaints (platform ombudsman flow)

Users **do not** appeal to state bodies through the app. Flow:

1. User opens transparency event → **Complaint** (`complaintId`, `eventId`, free text).
2. Ticket queue for **compliance team** (SLA e.g. 30 days — product constant).
3. Review checks: Was `legalRef` valid? Did action match scope? Was `reasonText` non-empty and consistent with `reasonCode`?
4. Outcomes: `upheld` | `rejected` | `referred_internal` | `operator_error_confirmed` (with corrective action logged).
5. User receives **sanitized** outcome; investigation secrets are not leaked.

Complaints **do not** automatically restore deleted content if removal was legally valid.

---

## 10) Reason taxonomy (starter set)

Maintain `docs/security/lawful-reason-codes.json` (future) or DB table `privileged_reason_codes`:

| `reasonCode` | Label (RU) | Typical `disclosureLevel` |
|--------------|------------|---------------------------|
| `court_order` | Исполнение судебного акта | partial / full |
| `criminal_investigation` | Уголовное преследование | partial / sealed |
| `counter_terrorism` | Противодействие терроризму | partial / sealed |
| `child_safety` | Защита несовершеннолетних | partial |
| `spam_abuse_ori` | Нарушение правил платформы / ОРИ | full |
| `account_compromise` | Компрометация учётной записи | full |
| `other` | Иное (требует длинного `reasonText`) | partial |

`reasonText` is **always** required; `other` requires longer minimum length.

---

## 11) Roles and surfaces

| Role / surface | Public | Corporate |
|----------------|--------|-----------|
| `lawful_api` mTLS principal | External requests only | Disabled |
| `instance_owner` / `instance_admin` | Policy, lawful credentials, audit read | Same minus lawful |
| `security_auditor` | Read-only audit export | Read-only |
| `group_admin` / `channel_admin` | Moderation **without** lawful API | Org moderation |
| End user | Transparency + complaints | Normal chat; optional internal notices |

**Admin Console** (`apps/admin` — planned): install wizard (`DEPLOYMENT_PROFILE`), encryption defaults, audit viewer, complaint queue — **not** embedded in the main messenger for all users.

---

## 12) API sketch (lawful-access service)

Isolated service or gateway mount `/lawful/v1/*` — **never** exposed on corporate profile.

### `POST /lawful/v1/operations`

Request (abbreviated):

```json
{
  "action": "message_delete",
  "legalRef": "2026-12345-Суд-Москва",
  "reasonCode": "court_order",
  "reasonText": "Подробное описание основания не менее N символов…",
  "scope": { "chatId": "…", "messageIds": ["…"] },
  "requester": { "orgId": "…", "officerId": "…" }
}
```

Response `202`:

```json
{
  "privilegedOperationId": "…",
  "transparencyEventIds": ["…"],
  "disclosureLevel": "partial"
}
```

Errors: `400` validation, `403` out of scope, `409` duplicate `legalRef`, `422` E2EE plaintext unavailable.

### Integration with existing code

Implemented in P1:

- shared validation in `packages/contracts` (`validatePrivilegedOperationRequest`);
- `POST /privileged/operations` and legacy `POST /privileged/read` in `services/access-audit`;
- in-memory audit store + optional notify to `notifications`.

Still required:

- outbox: audit row → messaging mutation → user WS (P2+);
- Postgres persistence for audit (P1 remainder).

---

## 13) Implementation phases

| Phase | Deliverable | Services |
|-------|-------------|----------|
| **P0** | This document + profile env flags | docs, compose |
| **P1** | Extended `TransparencyEvent`, reason codes, `400` without reason | `packages/contracts`, `access-audit` |
| **P2** | Tombstones + transparency fanout | `messaging`, `notifications`, web client badge |
| **P3** | `lawful-access` gateway, mTLS, scope enforcement | new service, `api-gateway` |
| **P4** | Complaint entity + Admin Console queue | `access-audit`, `apps/admin` |
| **P5** | Public encryption mode + DM mutual consent | `messaging`, web client |
| **P6** | Compliance runbook templates, SIEM export | `infra/observability` |

---

## 14) Checklist before enabling public lawful API

- [ ] Counsel reviewed ORI status, retention, and user notification texts
- [ ] `DEPLOYMENT_PROFILE=public` and `LAWFUL_ACCESS_ENABLED=true` only in intended environments
- [ ] mTLS credentials rotated; no lawful routes on corporate clusters
- [ ] Audit store append-only and backed up
- [ ] E2E tests: reject without reason; transparency received by affected user; tombstone visible after delete
- [ ] Complaint flow audited end-to-end
- [ ] Privacy policy and terms describe encryption mode and transparency limits

---

## 15) Related documents

- [lawful-access-implementation-status.md](./lawful-access-implementation-status.md) — living ✅/⬜ tracker (update when coding)
- [e2ee-design.md](./e2ee-design.md)
- [threat-model.md](./threat-model.md)
- [deployment-profiles.md](../ops/deployment-profiles.md)
- [release-security-checklist.md](./release-security-checklist.md)
