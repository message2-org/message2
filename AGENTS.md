# Agent guide (Cursor / AI assistants)

Quick reference for working in this repository. Deep product/security docs live under `docs/`.

## Start here

| File | Purpose |
|------|---------|
| [docs/ai-context.md](docs/ai-context.md) | **Living status** — stack, scripts, §4 claims, priorities, decision log |
| [docs/ops/agent-coordination.md](docs/ops/agent-coordination.md) | **Multi-agent** — claim, `feature/<task_id>`, PR, release |
| [.cursor/rules/coursework-context.mdc](.cursor/rules/coursework-context.mdc) | **Immutable** coursework topic (always applied) |
| [.cursor/rules/agent-coordination.mdc](.cursor/rules/agent-coordination.mdc) | Claims + branches (always applied) |
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
pnpm media:fetch-emotions   # download bundled GIF/video presets into apps/web/public/emotion-assets
pnpm media:import-stickers -- --zip private/media-import/inbox/mood.zip --slug mood --title "Mood"
pnpm db:reset         # dev: wipe Docker DB volume + migrate
```

## Service map (local defaults)

| Package | Path | Port | Role |
|---------|------|------|------|
| `@message2/web` | `apps/web` | 5173 | React client |
| `@message2/api-gateway` | `services/api-gateway` | 4000 | HTTP entry, proxy; **Swagger UI** at `/docs`, spec at `/openapi.json` |
| `@message2/messaging` | `services/messaging` | 4001 | Auth, chats, WS, Prisma |
| `@message2/media` | `services/media` | 4002 | Uploads, MinIO |
| `@message2/notifications` | `services/notifications` | 4003 | Web Push + FCM dispatch, subscription store |
| `@message2/access-audit` | `services/access-audit` | 4004 | Privileged access audit (`POST /privileged/operations`) |
| `@message2/lawful-access` | `services/lawful-access` | 4005 | Public lawful API (`POST /lawful/v1/operations`, mTLS/IP allowlist) |
| `@message2/admin` | `apps/admin` | 5174 | Install wizard + complaint queue (admin JWT) |
| Shared types | `packages/contracts` | — | Cross-service contracts |

Infra: `infra/docker` (Compose project name `message2`). Observability: `infra/observability`.

## Do not commit

- `.env` (use `*.env.example` only)
- `node_modules/`, `dist/`, `build/`, `*.tsbuildinfo`, `.data/`
- Secrets, tokens, production keys

After `pnpm install`, local `.env` files are created by `scripts/setup-envs.mjs` and remain gitignored.

## Key docs

- Requirements: `docs/product/requirements.md`
- Client platforms (order: web → Android → desktop → iOS): `docs/product/client-platform-roadmap.md`
- Threat model: `docs/security/threat-model.md`
- E2EE: `docs/security/e2ee-design.md`
- Lawful access / transparency (public vs corporate): `docs/security/lawful-access-transparency.md`
- Lawful access **implementation status** (done / not done): `docs/security/lawful-access-implementation-status.md`
- Deployment profiles (public vs corporate): `docs/ops/deployment-profiles.md`
- Debian VPS: `docs/ops/deploy-debian-vps.md`
- Multi-agent workflow: [docs/ops/agent-coordination.md](docs/ops/agent-coordination.md)

## Git branches

- **Default branch: `develop`** (GitHub). Integrate all work there; **do not PR or merge to `main`** unless the user requests a release milestone (web/Android/desktop packaging).
- **`main`:** tagged releases only — not for day-to-day merges.
- **Agents:** one `task_id` → `feature/<task_id>` → PR → `develop` (see agent-coordination).
- Branch naming: `feature/…`, `fix/…`, `chore/…` from `develop`.
- Full model: [docs/ops/git-branching.md](docs/ops/git-branching.md).

## New agent / cloud agent handoff

1. Read [docs/ai-context.md](docs/ai-context.md) §4 **claims** and §6 (handoff prompt).
2. Read [docs/ops/agent-coordination.md](docs/ops/agent-coordination.md) — agent may **derive** `task_id` + `scope` from your task text; claim, branch `feature/<task_id>`, PR when done.
3. Read [lawful-access-implementation-status.md](docs/security/lawful-access-implementation-status.md) § Planned next.
4. Default continuation: **Track D Android** (Track B push done) unless the user specifies otherwise.

Lawful flow env: `INTERNAL_SERVICE_SECRET` must match in `services/messaging`, `services/access-audit`, and `services/lawful-access`. Public external API: `LAWFUL_API_SHARED_SECRET` (dev) or `LAWFUL_MTLS_REQUIRED=true` behind TLS.

```bash
pnpm --filter @message2/contracts test
pnpm --filter @message2/access-audit test
pnpm --filter @message2/lawful-access test
pnpm --filter @message2/messaging test
```

## When finishing a task

1. Set the claim row in `docs/ai-context.md` §4 to `done`, `needs_rework`, or `cancelled` only after the PR is **merged to `develop` with green CI** (`pnpm build && pnpm test` in GitHub Actions). See [agent-coordination.md](docs/ops/agent-coordination.md).
2. Update **sections 2–5** in `docs/ai-context.md` (status, priorities, short decision-log line).
3. Update **lawful-access-implementation-status.md** checkboxes/changelog when lawful-related. Do not change section 1 (coursework topic).

## Security note

If `.env` with real `JWT_SECRET` / encryption keys was ever pushed, **rotate those values** locally and treat old values as compromised (history may still contain them until rewritten).
