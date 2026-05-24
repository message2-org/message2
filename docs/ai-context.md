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

## 4) Active Priorities (Mutable)

- [x] Wire `media` service to MinIO; new attachments use `mediaId` (legacy base64 in `cipherText` still readable).
- [ ] Client-side encryption for message media blobs (E2E).
- [ ] Refine registration UX (`displayName` optional, clear labels).
- [ ] Define deployment-profile auth policy matrix (public vs corporate).
- [ ] Harden session/token lifecycle for production-grade behavior.
- [ ] Continue Android client integration later.

## 5) Decision Log (Mutable)

- 2026-05-24: Git branching: `develop` for integration, `main` for releases; see `docs/ops/git-branching.md`.
- 2026-05-24: Added root `.gitignore`, `AGENTS.md`, README AI section; stopped tracking `dist/`, `node_modules/`, and `*.env` (local secrets via `setup:env` only).
- 2026-05-24: `media` stores blobs in MinIO; chat attachments reference `mediaId`; gateway `/media` proxy; web uploads before send.
- 2026-05-24: Avatars stored as `media:<uuid>` in `User.avatarUrl` (blob in MinIO/filesystem); legacy `data:image` still accepted. Registration uploads avatar after account creation.
- 2026-05-24: Registration shows auto-avatar preview; client resizes to 256px before upload; message media no longer embedded in `cipherText` for new sends.
- 2026-05-24: Added split dev scripts (`dev:web`, `dev:backend`, `dev:backend:core`) and DB reset helpers (`db:reset`, `db:clear`).
- 2026-05-05: Local development can proceed with `pnpm dev` without Docker.
- 2026-05-05: `displayName` treated as optional; `email` considered policy-driven, not globally mandatory.

## 6) How To Update This File

- Update sections 2-5 when implementation or priorities change.
- Keep section 1 unchanged.
- Keep entries short and factual.
