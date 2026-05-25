# AI Project Context (Living Document)

Use this file as the mutable, up-to-date project context for any AI assistant.

## 1) Immutable Base

- Coursework topic (must not change):
  - "Design of a secure client-server application for messaging and multimedia exchange with deployment capability in corporate and public environments."

## 2) Current Implementation (Mutable)

- Monorepo: `pnpm` workspace.
- Agent onboarding: root `AGENTS.md`; living status in this file; immutable topic in `.cursor/rules/coursework-context.mdc`.
- Web client: `apps/web` (React + TypeScript + Vite).
- Services: `services/api-gateway`, `services/messaging`, `services/media`, `services/notifications`, `services/access-audit`.
- **Git (2026-05-24):** branch `develop`, commits `ab86195`…`9973eeb` (lawful access docs + P1 + P2); may be ahead of `origin/develop` until `git push`.
- Current local run mode:
  - `pnpm install`
  - Infra (PostgreSQL/Redis/MinIO): `pnpm infra:up` / `pnpm infra:down`
  - Full stack: `pnpm dev:full` or `pnpm infra:up` + `pnpm dev`
  - Split dev (debug UI without backend): `pnpm dev:web` (Vite :5173)
  - Split backend: `pnpm dev:backend:core` (gateway + messaging) or `pnpm dev:backend` (all services)
  - Per-service: `pnpm dev:gateway`, `dev:messaging`, `dev:media`, `dev:notifications`, `dev:audit`
  - DB wipe (dev only): `pnpm db:reset` (Docker volume + migrations) or `pnpm db:clear` (Prisma reset, infra must be up)
  - After pull: **`pnpm db:migrate:deploy`** (migration `20260524120000_transparency_tombstones`)
- Authentication baseline:
  - required: `username`, `password`
  - optional: `displayName`
  - `email` is not mandatory by default.
- **Lawful access (implemented P1–P2):**
  - `packages/contracts`: `validatePrivilegedOperationRequest`, reason codes, `TransparencyEventV1`
  - `access-audit`: `POST /privileged/operations`, `POST /privileged/read` (legacy); in-memory audit; calls messaging
  - `messaging`: Prisma `MessageDisclosure`, `MessageTombstone`, `TransparencyUserNotice`; `POST /internal/transparency`; WS `transparency.notice` / `message.disclosure` / `message.tombstone`; `GET /transparency/notices`
  - `apps/web`: transparency banner + 🕶️ badge on messages
  - Env: matching `INTERNAL_SERVICE_SECRET` in `messaging` + `access-audit` (see `.env.example`)

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

### Planned next (pick one track for new agents)

**Track A — Lawful access (recommended continuation)**

- [ ] **P3:** `services/lawful-access`, `POST /lawful/v1/operations`, gateway route (public only), mTLS / IP allowlist
- [ ] **P1 remainder:** Postgres append-only audit in `access-audit` (replace in-memory `store.ts`)
- [ ] **P4:** `Complaint` entity, transparency detail screen in web, `apps/admin` MVP (install wizard: profile + connectivity)
- [ ] **P0:** `DEPLOYMENT_PROFILE` / `LAWFUL_ACCESS_ENABLED` in root compose + messaging env guards

**Track B — Messenger v1 gaps**

- [ ] Message edit / delete / reply / react (API + web)
- [ ] Read receipts, typing, presence (WS + UI; remove client placeholders)
- [ ] Real push via `notifications` (FCM/Web Push stub today)

**Track C — Security / product**

- [ ] Client-side encryption for message media blobs (E2E)
- [ ] **P5:** Instance encryption policy (admin), per-chat modes, DM mutual consent for downgrade
- [ ] Define deployment-profile auth policy matrix (public vs corporate)
- [ ] Harden session/token lifecycle (refresh rotation exists; production policy)
- [ ] Refine registration UX (`displayName` optional, clear labels)
- [ ] Android client (`apps/android` stub only)
- [ ] Fix discovery UI: `SidebarDiscovery` still uses `mockRows` while API `/discover` is real

## 5) Decision Log (Mutable)

- 2026-05-24: Four commits on `develop`: docs lawful-access; P1 access-audit; P2 messaging; P2 web UI.
- 2026-05-24: Git branching: `develop` for integration, `main` for releases; see `docs/ops/git-branching.md`.
- 2026-05-24: Added root `.gitignore`, `AGENTS.md`, README AI section; stopped tracking `dist/`, `node_modules/`, and `*.env`.
- 2026-05-24: Lawful access P1 — contracts + `access-audit` `/privileged/operations`.
- 2026-05-24: Lawful access P2 — messaging transparency + web badge/banner; migration `20260524120000_transparency_tombstones`.
- 2026-05-24: Public vs corporate: lawful/transparency for **public** only; corporate flexible encryption (docs).
- 2026-05-05: `pnpm dev:web` without Docker; full stack needs `pnpm infra:up` or `pnpm dev:full`.

## 6) Handoff for new Cursor / cloud agents

**Prompt to paste:**

```text
Read docs/ai-context.md and docs/security/lawful-access-implementation-status.md.
Branch develop. Lawful access P1–P2 are done; continue with P3 (lawful-access service) unless I say otherwise.
Do not change coursework topic in section 1 of ai-context.
```

**Source of truth:** git + files above — not prior chat transcripts.

**Tests:** `pnpm --filter @message2/contracts test`, `pnpm --filter @message2/access-audit test`, `pnpm --filter @message2/messaging test`

## 7) How To Update This File

- Update sections 2–5 when implementation or priorities change.
- Keep section 1 unchanged.
- Keep entries short and factual.
