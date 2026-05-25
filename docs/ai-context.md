# AI Project Context (Living Document)

Use this file as the mutable, up-to-date project context for any AI assistant.

## 1) Immutable Base

- Coursework topic (must not change):
  - "Design of a secure client-server application for messaging and multimedia exchange with deployment capability in corporate and public environments."

## 2) Current Implementation (Mutable)

- Monorepo: `pnpm` workspace.
- Agent onboarding: root `AGENTS.md`; living status in this file; immutable topic in `.cursor/rules/coursework-context.mdc`.
- Web client: `apps/web` (React + TypeScript + Vite) — **reference messenger** for API/WS integration.
- Web admin: `apps/admin` (React + Vite, :5174) — install wizard, complaints, encryption policy, SIEM export (lawful P4–P6 MVP).
- Planned clients (not started): `apps/android` (Kotlin stub), `apps/desktop` / `apps/ios` — see `docs/product/client-platform-roadmap.md`.
- Services: `services/api-gateway`, `services/messaging`, `services/media`, `services/notifications`, `services/access-audit`, `services/lawful-access`.
- **Git:** default branch **`develop`** (GitHub); do not merge to **`main`** until a release milestone (web/Android/desktop). HEAD synced with `origin/develop`.
- Current local run mode:
  - `pnpm install`
  - Infra (PostgreSQL/Redis/MinIO): `pnpm infra:up` / `pnpm infra:down`
  - Full stack: `pnpm dev:full` or `pnpm infra:up` + `pnpm dev`
  - Split dev (debug UI without backend): `pnpm dev:web` (Vite :5173)
  - Split backend: `pnpm dev:backend:core` (gateway + messaging) or `pnpm dev:backend` (all services)
  - Per-service: `pnpm dev:gateway`, `dev:messaging`, `dev:media`, `dev:notifications`, `dev:audit`, `dev:lawful`, `dev:admin` (:5174)
  - DB wipe (dev only): `pnpm db:reset` (Docker volume + migrations) or `pnpm db:clear` (Prisma reset, infra must be up)
  - After pull: **`pnpm db:migrate:deploy`** (incl. `20260525200000_push_subscriptions`)
- Authentication baseline:
  - required: `username`, `password`
  - optional: `displayName`
  - `email` is not mandatory by default.
- **Messenger v1 (Track B):** edit/delete/reply/react; read/typing/presence WS; Web Push + FCM register/dispatch in `notifications`; messaging fires push on new message.
- **Lawful access (implemented P0–P6 MVP):**
  - `packages/contracts`: validation, `lawfulApiBodyToOperation`, `Complaint` types
  - `access-audit`: privileged/internal routes; Postgres audit + `complaints`; SIEM export/forward; admin queue API
  - `lawful-access`: `POST /lawful/v1/operations`; gateway `/lawful` (public only)
  - `messaging`: transparency notices, `GET /transparency/notices/:eventId`, `POST /transparency/complaints`
  - `apps/web`: banner, badge, **transparency detail modal** + complaint form
  - `apps/admin`: install wizard, complaints, encryption, SIEM export (`pnpm dev:admin` :5174)
  - Compliance runbooks: `docs/ops/compliance/`
  - Encryption: `metadata_only` | `server_encrypted` | `e2ee_strict`; DM downgrade needs peer consent
  - Env: `INTERNAL_SERVICE_SECRET` aligned across messaging, access-audit, lawful-access

## 3) Architecture/Policy Intent (Mutable)

- Keep auth model pluggable by deployment profile:
  - public profile may require `email` verification/recovery.
  - corporate profile may rely on internal identity policy (or username-only baseline).
- Security-first defaults across services.
- Preserve compatibility with self-hosted Debian deployment.
- Media storage: blobs in object storage (MinIO/S3 or dev filesystem); DB holds `mediaId` on messages and `media:<uuid>` on `User.avatarUrl`. Message `cipherText` stays encrypted payload (client E2E when enabled).
- Public profile lawful access: mandatory reason/`legalRef`, transparency + tombstones, user complaints — spec in `docs/security/lawful-access-transparency.md`. Corporate: external lawful API off; encryption **admin-configurable** (not forced max).
- Corporate connectivity (documented, not coded): `isolated` | `federation` | `public_bridge` — see `docs/ops/deployment-profiles.md`.
- **Implementation tracker:** `docs/security/lawful-access-implementation-status.md` — update after each coding session.

## 4) Active Priorities (Mutable)

### Done recently

- [x] Wire `media` service to MinIO; new attachments use `mediaId`.
- [x] Lawful access **P1** (contracts, validation, `POST /privileged/operations`, tests).
- [x] Lawful access **P2** (tombstones/disclosures, internal API, WS, web badge + banner).
- [x] Lawful access **P3** (`lawful-access` service, gateway `/lawful`, mTLS/IP/dev secret, internal audit bridge).
- [x] Lawful access **P1 remainder:** Postgres append-only audit (`privileged_audit_events`).
- [x] Lawful access **P4:** complaints, web detail modal, `apps/admin`.
- [x] Lawful access **P0:** shared profile helpers; corporate disables user transparency + lawful API.
- [x] Lawful access **P5:** encryption modes in contracts/DB; admin policy UI; DM downgrade consent in web.
- [x] Lawful access **P6:** SIEM NDJSON/CEF export, webhook forward, compliance runbooks.
- [x] Track B: message edit/delete/reply/react; read/typing/presence WS; Web Push + FCM dispatch; discovery v2 placeholder.

### Active work (claims) — multi-agent

See **`docs/ops/agent-coordination.md`**. Before coding: claim one row (`in_progress`, `scope`, `branch` = `feature/<task_id>`); create/checkout that branch from `develop`. On finish: PR → `develop`, then `done` / `needs_rework` / `cancelled` and update §2–§5.

| task_id | status | owner | since | scope | branch | notes |
|---------|--------|-------|-------|-------|--------|-------|
| *(none)* | — | — | — | — | — | Agent may derive `task_id`/`scope` from your task text — see `docs/ops/agent-coordination.md` |

### Planned next (pick one track for new agents)

**Default product line:** **Android** (`apps/android`) after stable web API; optional web polish; desktop (Tauri) / iOS later — `docs/product/client-platform-roadmap.md`.

**Track A — Lawful access**

- [x] P0–P6 complete (see `lawful-access-implementation-status.md`)
- [ ] Corporate-only follow-ups: federation, connectivity modes (documented, not coded)

**Track B — Messenger v1 (web reference client)**

- [x] Message edit / delete / reply / react (API + web)
- [x] Read receipts, typing, presence (WS + UI; DM online/offline + read ticks)
- [x] Real push via `notifications` (Web Push + FCM legacy API; dry-run without keys)
- [ ] Web messenger polish: session restore edge cases, media UX, deployment-profile auth UX as needed

**Track B-admin — Operator console (`apps/admin`)**

- [x] Lawful P4–P6 MVP (wizard, complaints, encryption, SIEM export)
- [ ] Extend only for corporate demo gaps (not a blocker for Android)

**Track C — Security / product**

- [ ] Client-side encryption for message media blobs (E2E)
- [ ] Double Ratchet E2EE (full protocol — see `e2ee-design.md`)
- [ ] Define deployment-profile auth policy matrix (public vs corporate)
- [ ] Harden session/token lifecycle (refresh rotation exists; production policy)
- [ ] Refine registration UX (`displayName` optional, clear labels)
- [x] Fix discovery UI: non-chat tabs show v2 placeholder (no mock rows)

**Track D — Native / desktop clients (after Track B push + stable web)**

- [ ] Android (`apps/android` — Kotlin + Compose stub)
- [ ] Desktop Linux/Windows/macOS — default plan: **Tauri shell** over `apps/web` (`apps/desktop` TBD)
- [ ] iOS (`apps/ios` TBD) — after Android integration patterns exist

## 5) Decision Log (Mutable)

- 2026-05-24: Four commits on `develop`: docs lawful-access; P1 access-audit; P2 messaging; P2 web UI.
- 2026-05-25: GitHub default branch `develop`; `main` only for large releases (not routine merges) — `docs/ops/git-branching.md`.
- 2026-05-24: Git branching: `develop` for integration, `main` for tagged releases; see `docs/ops/git-branching.md`.
- 2026-05-24: Added root `.gitignore`, `AGENTS.md`, README AI section; stopped tracking `dist/`, `node_modules/`, and `*.env`.
- 2026-05-24: Lawful access P1 — contracts + `access-audit` `/privileged/operations`.
- 2026-05-25: `3782087` on `develop` — lawful P3–P6, `apps/admin`, messenger v1, push (pushed to `origin/develop`).
- 2026-05-25: Track B push — `notifications` Web Push/FCM, Prisma subscriptions, web SW + subscribe, messaging `notifyMessagePush`.
- 2026-05-25: Track B — message edit/delete/reply/react; read receipts + typing + presence; discovery tabs without mocks.
- 2026-05-25: Lawful access P6 — SIEM export/forward + `docs/ops/compliance/` runbook templates.
- 2026-05-25: Lawful access P5 — encryption policy API, DM downgrade consent, admin Encryption tab, web badge.
- 2026-05-25: Lawful access P0 — `readInstanceProfileFromEnv` in contracts; corporate skips transparency UX; `GET /instance/profile`.
- 2026-05-25: Lawful access P4 — `Complaint` model, messaging transparency detail/complaints, web modal, `apps/admin` wizard + queue.
- 2026-05-25: Lawful access P1 remainder — Postgres `privileged_audit_events` in `access-audit`; `pnpm db:migrate:deploy` runs messaging + audit.
- 2026-05-25: Lawful access P3 — `lawful-access` :4005, gateway `/lawful` (public only), `POST /internal/privileged/operations`, duplicate `legalRef` 409.
- 2026-05-24: Lawful access P2 — messaging transparency + web badge/banner; migration `20260524120000_transparency_tombstones`.
- 2026-05-24: Public vs corporate: lawful/transparency for **public** only; corporate flexible encryption (docs).
- 2026-05-25: Multi-agent coordination — claims table + `feature/<task_id>` + PR (`docs/ops/agent-coordination.md`, `.cursor/rules/agent-coordination.mdc`).
- 2026-05-25: Client platform order documented — web v1 → push → Android → Tauri desktop → iOS (`docs/product/client-platform-roadmap.md`).
- 2026-05-05: `pnpm dev:web` without Docker; full stack needs `pnpm infra:up` or `pnpm dev:full`.

## 6) Handoff for new Cursor / cloud agents

**Prompt to paste:**

```text
Read docs/ai-context.md §4 + docs/ops/agent-coordination.md.
Task: <опишите задачу — task_id/scope необязательны; агент предложит сам>
Derive task_id + scope, show me, claim if free, branch feature/<task_id>, then work.
If task_id already in_progress by another agent: stop and report.
Default next: Track D Android (push done). See docs/product/client-platform-roadmap.md.
On finish: pull develop, test, PR→develop; release claim; update §2–5. Do not change section 1.
```

**Source of truth:** git + files above — not prior chat transcripts.

**Tests:** `pnpm --filter @message2/contracts test`, `pnpm --filter @message2/access-audit test`, `pnpm --filter @message2/messaging test`, `pnpm --filter @message2/notifications test`

## 7) How To Update This File

- Update sections 2–5 when implementation or priorities change.
- **Claims (§4):** add row at session start; set `done` / `needs_rework` / `cancelled` at end; include `branch` and PR note if merge pending.
- Keep section 1 unchanged.
- Keep entries short and factual.
