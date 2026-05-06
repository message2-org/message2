# AI Project Context (Living Document)

Use this file as the mutable, up-to-date project context for any AI assistant.

## 1) Immutable Base

- Coursework topic (must not change):
  - "Design of a secure client-server application for messaging and multimedia exchange with deployment capability in corporate and public environments."

## 2) Current Implementation (Mutable)

- Monorepo: `pnpm` workspace.
- Web client: `apps/web` (React + TypeScript + Vite).
- Services: `services/api-gateway`, `services/messaging`, `services/media`, `services/notifications`, `services/access-audit`.
- Current local run mode:
  - `pnpm install`
  - `pnpm dev`
  - Runs without Docker for core dev flow.
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

## 4) Active Priorities (Mutable)

- [ ] Refine registration UX (`displayName` optional, clear labels).
- [ ] Define deployment-profile auth policy matrix (public vs corporate).
- [ ] Harden session/token lifecycle for production-grade behavior.
- [ ] Continue Android client integration later.

## 5) Decision Log (Mutable)

- 2026-05-05: Local development can proceed with `pnpm dev` without Docker.
- 2026-05-05: `displayName` treated as optional; `email` considered policy-driven, not globally mandatory.

## 6) How To Update This File

- Update sections 2-5 when implementation or priorities change.
- Keep section 1 unchanged.
- Keep entries short and factual.
