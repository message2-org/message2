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
- Current local run mode:
  - `pnpm install`
  - Infra (PostgreSQL/Redis/MinIO): `pnpm infra:up` / `pnpm infra:down`
  - Full stack: `pnpm dev:full` or `pnpm infra:up` + `pnpm dev`
  - Split dev (debug UI without backend): `pnpm dev:web` (Vite :5173)
  - Split backend: `pnpm dev:backend:core` (gateway + messaging) or `pnpm dev:backend` (all services)
  - Per-service: `pnpm dev:gateway`, `dev:messaging`, `dev:media`, `dev:notifications`, `dev:audit`
  - DB wipe (dev only): `pnpm db:reset` (Docker volume + migrations) or `pnpm db:clear` (Prisma reset, infra must be up)
- Authentication baseline:
  - required: `username`, `password`
  - optional: `displayName`
  - `email` is not mandatory by default.

## 3) Architecture/Policy Intent (Mutable)

- Keep auth model pluggable by deployment profile:
  - public profile may require `email` verification/recovery.
  - corporate profile may rely on internal identity policy (or username-only baseline).
- Security-first defaults across services.
- Preserve compatibility with self-hosted Debian deployment.
- Media storage: blobs in object storage (MinIO/S3 or dev filesystem); DB holds `mediaId` on messages and `media:<uuid>` on `User.avatarUrl`. Message `cipherText` stays encrypted payload (client E2E when enabled).
- Public profile lawful access: mandatory reason/`legalRef`, transparency + tombstones, user complaints — spec in `docs/security/lawful-access-transparency.md`. Corporate: external lawful API off; encryption **admin-configurable** (not forced max).
- **Implementation tracker (lawful access / profiles):** `docs/security/lawful-access-implementation-status.md` — update after each coding session; survives closed agent chats.

## 4) Active Priorities (Mutable)

- [x] Wire `media` service to MinIO; new attachments use `mediaId` (legacy base64 in `cipherText` still readable).
- [ ] Client-side encryption for message media blobs (E2E).
- [ ] Refine registration UX (`displayName` optional, clear labels).
- [x] Lawful access **P1** (contracts, validation, `POST /privileged/operations`, tests).
- [x] Lawful access **P2** (tombstones/disclosures in messaging, WS, web badge + banner). Detail screen / complaints → P4.
- [ ] Define deployment-profile auth policy matrix (public vs corporate).
- [ ] Harden session/token lifecycle for production-grade behavior (refresh rotation exists; tighten policy/docs).
- [ ] Align v1 product gaps: message edit/delete/react, receipts/typing/presence, real push (see lawful-access-implementation-status § Compliance audit).
- [ ] Continue Android client integration later.

## 5) Decision Log (Mutable)

- 2026-05-24: Git branching: `develop` for integration, `main` for releases; see `docs/ops/git-branching.md`.
- 2026-05-24: Added root `.gitignore`, `AGENTS.md`, README AI section; stopped tracking `dist/`, `node_modules/`, and `*.env` (local secrets via `setup:env` only).
- 2026-05-24: `media` stores blobs in MinIO; chat attachments reference `mediaId`; gateway `/media` proxy; web uploads before send.
- 2026-05-24: Avatars stored as `media:<uuid>` in `User.avatarUrl` (blob in MinIO/filesystem); legacy `data:image` still accepted. Registration uploads avatar after account creation.
- 2026-05-24: Registration shows auto-avatar preview; client resizes to 256px before upload; message media no longer embedded in `cipherText` for new sends.
- 2026-05-24: Added split dev scripts (`dev:web`, `dev:backend`, `dev:backend:core`) and DB reset helpers (`db:reset`, `db:clear`).
- 2026-05-05: `pnpm dev:web` works without Docker; full stack needs `pnpm infra:up` (Postgres/Redis/MinIO) before `pnpm dev` or use `pnpm dev:full`.
- 2026-05-05: `displayName` treated as optional; `email` considered policy-driven, not globally mandatory.
- 2026-05-24: Added `docs/security/lawful-access-transparency.md` (public lawful API policy, operator requirements, transparency, complaints, implementation phases).
- 2026-05-24: Requirements + `lawful-access-implementation-status.md` tracker for cross-chat continuity (spec is mostly 📄; code still P0–P1 stub).
- 2026-05-24: Compliance audit — structure matches AGENTS; lawful/E2EE/v1 features mostly ⬜; fixed README Argon2 wording + docker dev note.
- 2026-05-24: Lawful access P1 — `@message2/contracts` lawful types/validation; `access-audit` `/privileged/operations`; `lawful-reason-codes.json`; tests.
- 2026-05-24: Lawful access P2 — messaging transparency tables, `/internal/transparency`, WS events, web 🕶️ badge + banner. Run `pnpm db:migrate:deploy` after pull.

## 6) How To Update This File

- Update sections 2-5 when implementation or priorities change.
- Keep section 1 unchanged.
- Keep entries short and factual.
