# Lawful access & deployment profiles — implementation status

**Living tracker** for humans and AI assistants. Update this file whenever code or requirements change (not only `docs/ai-context.md`).

Spec: [lawful-access-transparency.md](./lawful-access-transparency.md) · Phases: §13 there.

Last updated: **2026-05-24** (compliance audit)

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
| `DEPLOYMENT_PROFILE` env wiring | 🟡 | `services/access-audit/.env.example` |
| `LAWFUL_ACCESS_ENABLED` forced off for corporate | 🟡 | Validated in `validatePrivilegedOperationRequest` + config |
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
| Unit tests (contracts + access-audit) | ✅ | `pnpm --filter @message2/contracts test` |
| Persistent audit store (Postgres) | ⬜ | In-memory array in `store.ts` |
| Notify notifications service | 🟡 | fire-and-forget `fetch` (warn if down) |

### P2 — Transparency UX & tombstones

| Item | Status | Notes |
|------|--------|-------|
| Tombstone model in `messaging` (Prisma) | ✅ | Migration `20260524120000_transparency_tombstones` |
| `POST /internal/transparency` | ✅ | `x-internal-secret`; called from access-audit |
| `GET /transparency/notices` | ✅ | Per-user notices |
| `notifications` → real fanout | 🟡 | Still stub; WS is primary |
| Web client badge on message | ✅ | 🕶️ on `message.disclosure` |
| Web transparency banner | ✅ | On `transparency.notice` WS |
| Web transparency detail screen | ⬜ | Complaint UI (P4) |
| WS delivery of transparency events | ✅ | `transparency.notice`, `message.disclosure`, `message.tombstone` |

### P3 — Lawful-access gateway

| Item | Status | Notes |
|------|--------|-------|
| `services/lawful-access` | ⬜ | |
| `POST /lawful/v1/operations` | ⬜ | |
| mTLS / IP allowlist | ⬜ | |
| Gateway route (public only) | ⬜ | |

### P4 — Complaints & Admin Console

| Item | Status | Notes |
|------|--------|-------|
| `Complaint` entity + API | ⬜ | |
| `apps/admin` | ⬜ | |
| Install wizard (profile + connectivity) | ⬜ | |

### P5 — Encryption policy (corporate flexible + public hybrid)

| Item | Status | Notes |
|------|--------|-------|
| Instance encryption defaults (admin) | ⬜ | |
| Per-chat mode | ⬜ | |
| DM mutual consent for downgrade | ⬜ | |
| Client E2EE (Double Ratchet) | ⬜ | See also `ai-context` media E2EE priority |

### P6 — Compliance ops

| Item | Status | Notes |
|------|--------|-------|
| SIEM export for audit | ⬜ | |
| Legal runbook templates | ⬜ | |

---

## Corporate-specific

| Item | Status | Notes |
|------|--------|-------|
| External lawful API disabled | 📄 | Policy only; no runtime guard yet |
| Admin-configurable encryption (no forced max) | 📄 | `deployment-profiles.md` |
| Connectivity: `isolated` / `federation` / `public_bridge` | 📄 | No code |
| Federation between corporate servers | ⬜ | |

---

## Compliance audit (2026-05-24)

| Area | Docs say | Code reality | Verdict |
|------|----------|--------------|---------|
| Monorepo layout | AGENTS / ai-context | Matches `apps/web`, `services/*`, `packages/contracts` | ✅ |
| Lawful access P1–P6 | requirements v2+, spec | Stubs only (`access-audit`, notifications) | ⬜ expected |
| `DEPLOYMENT_PROFILE` | deployment-profiles | Not in `.env.example` / compose | ⬜ |
| E2EE | e2ee-design, README | `cipherText` JSON/plain; no Double Ratchet | ⬜ |
| Argon2id | deployment-profiles | Implemented in messaging | ✅ (README was stale; fixed) |
| Refresh rotation | ai-context priority | `/auth/refresh` rotates + revokes | 🟡 partial vs “production-grade” |
| v1: edit/delete/react messages | requirements v1 | No API routes | ❌ gap |
| v1: read receipts / typing / presence | requirements v1 | WS only `message.created`; UI placeholders | ❌ gap |
| v1: phone/email login | requirements v1 | username only; email/phone in private profile | 🟡 |
| v1: push | requirements v1 | notifications stub | ⬜ |
| Media MinIO | ai-context [x] | `media` + `mediaId` on messages | ✅ |
| Android | ai-context priority | README stub only | ⬜ planned |
| Discovery sidebar mock | — | `SidebarDiscovery` uses `mockRows`; API `/discover` exists | 🟡 UI drift |

---

## Changelog (implementation tracker)

| Date | Change |
|------|--------|
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
