# Agent guide (Cursor / AI assistants)

Quick reference for working in this repository. Deep product/security docs live under `docs/`.

## Start here

| File | Purpose |
|------|---------|
| [docs/ai-context.md](docs/ai-context.md) | **Living status** — stack, scripts, active priorities, decision log |
| [.cursor/rules/coursework-context.mdc](.cursor/rules/coursework-context.mdc) | **Immutable** coursework topic and guardrails (always applied in Cursor) |
| [README.md](README.md) | Human onboarding, quick start, security overview |

If chat memory conflicts with `docs/ai-context.md`, **prefer the file**.

## Commands

```bash
pnpm install          # bootstraps .env from .env.example where missing
pnpm infra:up         # Postgres, Redis, MinIO
pnpm dev:full         # infra + migrations + full stack
pnpm dev              # all services + web (infra must be up)
pnpm dev:web          # Vite only (:5173)
pnpm dev:backend:core # gateway + messaging + media
pnpm dev:backend      # all backend services
pnpm build && pnpm test
pnpm db:migrate:deploy
pnpm db:reset         # dev: wipe Docker DB volume + migrate
```

## Service map (local defaults)

| Package | Path | Port | Role |
|---------|------|------|------|
| `@message2/web` | `apps/web` | 5173 | React client |
| `@message2/api-gateway` | `services/api-gateway` | 4000 | HTTP entry, proxy |
| `@message2/messaging` | `services/messaging` | 4001 | Auth, chats, WS, Prisma |
| `@message2/media` | `services/media` | 4002 | Uploads, MinIO |
| `@message2/notifications` | `services/notifications` | 4003 | Push orchestration |
| `@message2/access-audit` | `services/access-audit` | 4004 | Privileged access audit (`POST /privileged/operations`) |
| Shared types | `packages/contracts` | — | Cross-service contracts |

Infra: `infra/docker` (Compose project name `message2`). Observability: `infra/observability`.

## Do not commit

- `.env` (use `*.env.example` only)
- `node_modules/`, `dist/`, `build/`, `*.tsbuildinfo`, `.data/`
- Secrets, tokens, production keys

After `pnpm install`, local `.env` files are created by `scripts/setup-envs.mjs` and remain gitignored.

## Key docs

- Requirements: `docs/product/requirements.md`
- Threat model: `docs/security/threat-model.md`
- E2EE: `docs/security/e2ee-design.md`
- Lawful access / transparency (public vs corporate): `docs/security/lawful-access-transparency.md`
- Lawful access **implementation status** (done / not done): `docs/security/lawful-access-implementation-status.md`
- Deployment profiles (public vs corporate): `docs/ops/deployment-profiles.md`
- Debian VPS: `docs/ops/deploy-debian-vps.md`

## Git branches

- Integrate on **`develop`**; keep **`main`** for releases/tags.
- Branch naming: `feature/…`, `fix/…`, `chore/…` from `develop`.
- Full model: [docs/ops/git-branching.md](docs/ops/git-branching.md).

## New agent / cloud agent handoff

1. Read [docs/ai-context.md](docs/ai-context.md) §6 (handoff prompt).
2. Read [lawful-access-implementation-status.md](docs/security/lawful-access-implementation-status.md) § Planned next.
3. Default continuation: **lawful access P3** unless the user chooses v1 messenger gaps.

Lawful flow env: `INTERNAL_SERVICE_SECRET` must match in `services/messaging` and `services/access-audit`.

```bash
pnpm --filter @message2/contracts test
pnpm --filter @message2/access-audit test
pnpm --filter @message2/messaging test
```

## When finishing a task

Update **sections 2–5** in `docs/ai-context.md` (status, priorities, short decision-log line). Update **lawful-access-implementation-status.md** checkboxes/changelog. Do not change section 1 (coursework topic).

## Security note

If `.env` with real `JWT_SECRET` / encryption keys was ever pushed, **rotate those values** locally and treat old values as compromised (history may still contain them until rewritten).
