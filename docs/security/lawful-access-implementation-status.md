# Lawful access & deployment profiles — implementation status

**Living tracker** for humans and AI assistants. Update this file whenever code or requirements change (not only `docs/ai-context.md`).

Spec: [lawful-access-transparency.md](./lawful-access-transparency.md) · Phases: §13 there.

Last updated: **2026-05-25** (P1–P3 done; handoff for new agents)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done in repo (may be stub/MVP) |
| 🟡 | Partial / stub only |
| ⬜ | Not started |
| 📄 | Documentation only |
| ❌ | Explicitly removed or out of scope |

---

## Documentation

| Item | Status | Location |
|------|--------|----------|
| Public lawful-access policy | 📄✅ | `lawful-access-transparency.md` |
| Deployment profiles (public/corporate, connectivity) | 📄✅ | `../ops/deployment-profiles.md` |
| E2EE + encryption modes | 📄✅ | `e2ee-design.md` |
| Threat model controls | 📄✅ | `threat-model.md` |
| Product requirements (user-facing) | 📄✅ | `../product/requirements.md` § Lawful access |
| **This status tracker** | 📄✅ | this file |

---

## Code & infrastructure (by phase)

### P0 — Profile flags & docs

| Item | Status | Notes |
|------|--------|-------|
| `DEPLOYMENT_PROFILE` env wiring | ✅ | All core services + compose `MESSAGE2_DEPLOYMENT_PROFILE` |
| `LAWFUL_ACCESS_ENABLED` forced off for corporate | ✅ | `resolveLawfulAccessEnabled` in `@message2/contracts` |
| Messaging user transparency guards | ✅ | Corporate: no notices/WS/complaint API; `GET /instance/profile` |
| `CORPORATE_CONNECTIVITY_MODE` env | ✅ | Documented + health/instance profile |
| README / AGENTS pointers | ✅ | |

### P1 — Contracts & audit validation

| Item | Status | Notes |
|------|--------|-------|
| Extended `TransparencyEventV1` (action, scope, legalRef, …) | ✅ | `packages/contracts/src/lawful.ts` |
| `PrivilegedAction`, `DisclosureLevel` types | ✅ | |
| Reason codes taxonomy | ✅ | `lawful-reason-codes.json` + `LAWFUL_REASON_CODES` in contracts |
| `POST /privileged/operations` with full validation | ✅ | `services/access-audit` |
| `POST /privileged/read` legacy mapper | ✅ | Maps to operations schema |
| Reject without `legalRef` / `reasonCode` / scope | ✅ | 400 + `validation_failed` |
| Duplicate `legalRef` → 409 | ✅ | `access-audit` in-memory store |
| Unit tests (contracts + access-audit) | ✅ | `pnpm --filter @message2/contracts test` |
| `POST /internal/privileged/operations` | ✅ | `x-internal-secret`; used by `lawful-access` |
| Persistent audit store (Postgres) | ✅ | `privileged_audit_events`; `AUDIT_STORE=postgres` (tests: `memory`) |
| Notify notifications service | 🟡 | fire-and-forget `fetch` (warn if down) |

### P2 — Transparency UX & tombstones

| Item | Status | Notes |
|------|--------|-------|
| Tombstone model in `messaging` (Prisma) | ✅ | Migration `20260524120000_transparency_tombstones` |
| `POST /internal/transparency` | ✅ | `x-internal-secret`; called from access-audit |
| `GET /transparency/notices` | ✅ | Per-user notices |
| `notifications` → real fanout | ✅ | Web Push + FCM legacy; dry-run without VAPID/FCM keys |
| Web client badge on message | ✅ | 🕶️ on `message.disclosure` |
| Web transparency banner | ✅ | On `transparency.notice` WS |
| Web transparency detail screen | ✅ | Modal + complaint form (`TransparencyDetailModal`) |
| WS delivery of transparency events | ✅ | `transparency.notice`, `message.disclosure`, `message.tombstone` |

### P3 — Lawful-access gateway

| Item | Status | Notes |
|------|--------|-------|
| `services/lawful-access` | ✅ | Port 4005; `pnpm dev:lawful` |
| `POST /lawful/v1/operations` | ✅ | 202 + `lawfulApiBodyToOperation`; forwards to access-audit |
| mTLS / IP allowlist | 🟡 | `LAWFUL_MTLS_REQUIRED`, headers `x-ssl-client-verify` / forwarded cert; dev `x-lawful-api-secret` |
| Gateway route (public only) | ✅ | `api-gateway` `/lawful` proxy; 404 on corporate |

### P4 — Complaints & Admin Console

| Item | Status | Notes |
|------|--------|-------|
| `Complaint` entity + API | ✅ | Prisma `complaints`; internal + admin routes in `access-audit` |
| User complaint via messaging | ✅ | `POST /transparency/complaints`, `GET /transparency/notices/:eventId` |
| `apps/admin` | ✅ | `pnpm dev:admin` :5174 |
| Install wizard (profile + connectivity) | ✅ | Corporate connectivity cards, env snippets, drift vs `GET /instance/profile` |

### P5 — Encryption policy (corporate flexible + public hybrid)

| Item | Status | Notes |
|------|--------|-------|
| Instance encryption defaults (admin) | ✅ | `instance_settings` + `PUT /admin/encryption/policy` |
| Per-chat mode | ✅ | `Chat.encryptionMode`, `GET/POST /chats/:id/encryption` |
| DM mutual consent for downgrade | ✅ | `encryption_downgrade_requests` + web consent banner |
| Client E2EE (Double Ratchet) | ⬜ | See also `ai-context` media E2EE priority |

### P6 — Compliance ops

| Item | Status | Notes |
|------|--------|-------|
| SIEM export for audit | ✅ | `GET /admin/audit/export`, `POST /admin/siem/forward` |
| Legal runbook templates | ✅ | `docs/ops/compliance/*.md` |

---

## Corporate-specific

| Item | Status | Notes |
|------|--------|-------|
| External lawful API disabled (corporate) | ✅ | `readInstanceProfileFromEnv`; gateway `/lawful` 404 on corporate |
| Admin-configurable encryption (no forced max) | 📄 | `deployment-profiles.md` |
| Connectivity: `isolated` / `federation` / `public_bridge` | 📄 | No code |
| Federation between corporate servers | ⬜ | |

---

## Planned next (for new agents — 2026-05-25)

Lawful access **P0–P6** and Track B web v1 + push are complete. Default product work:

| Priority | Track | Task |
|----------|-------|------|
| 1 | D | Android client (`apps/android`) — FCM register, auth, chats |
| 2 | B | Web polish (session restore, media UX, profile auth per deployment) |
| 3 | D | Desktop via Tauri — see `docs/product/client-platform-roadmap.md` |
| alt | C | E2EE / media client encryption |

---

## Compliance audit (2026-05-24)

| Area | Docs say | Code reality | Verdict |
|------|----------|--------------|---------|
| Monorepo layout | AGENTS / ai-context | Matches `apps/web`, `services/*`, `packages/contracts` | ✅ |
| Lawful access P1–P2 | spec | Implemented (see phases above) | ✅ |
| Lawful access P3 | spec | `lawful-access` + gateway `/lawful` | ✅ |
| Lawful access P4–P6 | spec | complaints, encryption, SIEM, `apps/admin` | ✅ |
| `DEPLOYMENT_PROFILE` | deployment-profiles | contracts helper + all services | ✅ |
| E2EE | e2ee-design, README | `cipherText` JSON/plain; no Double Ratchet | ⬜ |
| Argon2id | deployment-profiles | Implemented in messaging | ✅ (README was stale; fixed) |
| Refresh rotation | ai-context priority | `/auth/refresh` rotates + revokes | 🟡 partial vs “production-grade” |
| v1: edit/delete/react messages | requirements v1 | PATCH/DELETE/reply/reactions routes + web | ✅ |
| v1: read receipts / typing / presence | requirements v1 | `POST /read`, `/typing`, WS events, web UI | ✅ |
| v1: phone/email login | requirements v1 | username only; email/phone in private profile | 🟡 |
| v1: push | requirements v1 | Web Push + FCM + messaging dispatch | ✅ |
| Media MinIO | ai-context [x] | `media` + `mediaId` on messages | ✅ |
| Android | client-platform-roadmap Phase 3 | `apps/android` stub only | ⬜ after web v1 + push |
| Desktop / iOS | client-platform-roadmap Phase 4–5 | not in repo | ⬜ planned (Tauri / iOS TBD) |
| Discovery sidebar mock | — | v2 tabs show placeholder; chats/channels/users use API | ✅ |

---

## Changelog (implementation tracker)

| Date | Change |
|------|--------|
| 2026-05-25 | Track B push: `notifications` Web Push/FCM, messaging `notifyMessagePush`, web `sw.js` |
| 2026-05-25 | Track B messenger: message actions, read/typing/presence, message migrations |
| 2026-05-25 | Multi-agent: `docs/ops/agent-coordination.md`, claims in ai-context §4, `.cursor/rules/agent-coordination.mdc` |
| 2026-05-25 | Added `docs/product/client-platform-roadmap.md` (web → push → Android → desktop → iOS) |
| 2026-05-25 | **P6 implemented:** SIEM NDJSON/CEF export, webhook forward, compliance runbooks |
| 2026-05-25 | **P5 implemented:** encryption modes, instance policy, DM downgrade mutual consent |
| 2026-05-25 | **P0 implemented:** shared deployment profile helpers; corporate transparency/lawful guards |
| 2026-05-25 | **P4 implemented:** complaints table/API, web transparency modal, `apps/admin` |
| 2026-05-25 | **P1 Postgres audit:** `privileged_audit_events` migration, Prisma store in `access-audit` |
| 2026-05-25 | **P3 implemented:** `lawful-access`, gateway `/lawful`, internal audit route, 409 duplicate `legalRef` |
| 2026-05-24 | Handoff section + audit refresh; P1–P2 marked done for new agents |
| 2026-05-24 | **P2 implemented:** Prisma tombstones/disclosures/notices, internal transparency API, WS + web badge/banner |
| 2026-05-24 | **P1 implemented:** contracts validation, `POST /privileged/operations`, env example, tests |
| 2026-05-24 | Compliance audit section added (docs vs code matrix) |
| 2026-05-24 | Added spec `lawful-access-transparency.md`; stub `access-audit` + `TransparencyEvent`; notifications transparency stub |
| 2026-05-24 | Corporate: flexible encryption + connectivity modes documented (not coded) |
| 2026-05-24 | Created this status file; linked from `requirements.md` and `ai-context.md` |

---

## For AI assistants (after closing a chat)

1. Read **[docs/ai-context.md](../ai-context.md)** — stack, priorities, decision log.
2. Read **this file** — what is ✅ / ⬜ for lawful access.
3. Read **spec** only when designing: `lawful-access-transparency.md`.
4. After merging code, update **Changelog** above and checkboxes in the matching phase.

Agent transcripts in Cursor are **not** a source of truth; git + these docs are.
