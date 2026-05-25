# Message2 / Послание2

<p align="center">
  <img src="apps/web/public/brand/logo.svg" alt="Message2 logo" width="104" height="104">
</p>

Secure multimedia messenger for Web and Android with E2EE-first architecture.
Coursework focus: secure client-server system for corporate and public deployment scenarios.

## About

Message2 (Russian locale name: "Послание2") is a modular messenger platform focused on privacy, modern UI, and self-hosted Debian deployment.

- Web messenger: React + TypeScript (`apps/web`)
- Web admin console: React + TypeScript (`apps/admin`, :5174)
- Planned Android app: Kotlin + Compose (`apps/android`)
- Planned desktop: Tauri (or similar) over web UI — see `docs/product/client-platform-roadmap.md`
- API and services: Node.js + TypeScript (`services/*`)
- Local/dev deployment: Docker Compose (`infra/docker`)

Repository: [github.com/sun-demon/message2](https://github.com/sun-demon/message2)

## Monorepo Structure

- `apps/web` - React web messenger (reference client)
- `apps/admin` - instance admin / compliance console
- `apps/android` - native Android client (Kotlin + Compose, stub)
- `apps/desktop` / `apps/ios` - not started; roadmap in `docs/product/client-platform-roadmap.md`
- `services/api-gateway` - API entrypoint and routing
- `services/messaging` - users/chats/messages + realtime
- `services/media` - media upload and preview pipeline
- `services/notifications` - Web Push + FCM dispatch and device/subscription store
- `services/access-audit` - privileged access API, audit, transparency events
- `infra/docker` - local/prod container orchestration
- `infra/observability` - Prometheus/Grafana setup
- `docs` - product, security, operations, test plans
- `docs/ai-context.md` - living implementation status and priorities (for contributors and AI assistants)
- `AGENTS.md` - concise agent onboarding (commands, service map, do-not-commit rules)

## AI-assisted development

When using Cursor or other AI tools on this repo:

1. Read [docs/ai-context.md](docs/ai-context.md) — §4 **claims** (who works on what) and priorities.
2. Follow [.cursor/rules/coursework-context.mdc](.cursor/rules/coursework-context.mdc) and [.cursor/rules/agent-coordination.mdc](.cursor/rules/agent-coordination.mdc).
3. Use [AGENTS.md](AGENTS.md) for commands and ports.
4. **Parallel agents:** describe the task in plain language — the agent assigns `task_id` + `scope`, claims §4, branches `feature/<task_id>`, PR to `develop`. Details: [docs/ops/agent-coordination.md](docs/ops/agent-coordination.md).

After meaningful changes, update sections 2–5 in `docs/ai-context.md` and release your claim row (not section 1).

## Quick Start

### Requirements

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose (for infra services)
- WSL Debian / Debian Linux (recommended for parity with VPS)

### Run

1. Install dependencies:

   ```bash
   pnpm install
   ```

   Missing `.env` files are bootstrapped automatically from `.env.example` files (without overwriting existing `.env` values). That includes `services/messaging/.env` and `infra/docker/.env` — you do **not** need to copy `.env.example` by hand after `pnpm install` or before `pnpm dev` (both run `setup:env`). If you omit `infra/docker/.env`, Compose still uses defaults from `docker-compose.yml` (`MESSAGE2_POSTGRES_PORT` defaults to **15432** on the host).

2. Start local infrastructure:

   ```bash
   pnpm infra:up
   ```

3. Start all apps/services:

   ```bash
   pnpm dev
   ```

4. Open web client:

   - [http://localhost:5173](http://localhost:5173)

### Useful Shortcuts

Docker Compose project name is fixed to **`message2`** (see `infra/docker/docker-compose.yml`). Containers and volumes are prefixed accordingly (e.g. `message2-postgres-1`, `message2_pg_data`). If you used an older compose default name before, old volumes may remain on disk until you remove them with `docker volume ls` / `docker volume rm`.

Postgres is published on the host on **`MESSAGE2_POSTGRES_PORT`** (default **15432** in `infra/docker/docker-compose.yml`) so it avoids common clashes with services on **5432** / **5433**. Keep `DATABASE_URL` in `services/messaging/.env` in sync (same host port). `pnpm setup:env` creates `infra/docker/.env` from `infra/docker/.env.example` when that file is missing (no manual `cp`).

- `pnpm infra:up` - start local infra services (`postgres`, `redis`, `minio`)
- `pnpm infra:down` - stop infra services
- `pnpm infra:reset` - recreate infra volumes (useful when DB credentials/state drift)
- `pnpm db:migrate` - run messaging Prisma migrations (`migrate dev`, interactive when creating new migrations)
- `pnpm db:migrate:deploy` - apply existing migrations only (`migrate deploy`, safe for scripts / fresh clones)
- `pnpm dev:full` - infra up + `db:migrate:deploy` + app stack dev mode

### Postgres port already in use

If `infra:up` fails with `Bind for 0.0.0.0:15432 failed: port is already allocated` (or any other port), set another free port in `infra/docker/.env` (`MESSAGE2_POSTGRES_PORT`) and the same port in `services/messaging/.env` (`DATABASE_URL`), then run `pnpm infra:down && pnpm infra:up`. To see what else listens on a port: `docker ps` and `ss -tlnp` (Linux/WSL).

## Authentication Policy (Pluggable)

Current baseline supports `username + password` with optional `displayName`.

Recommended production approach is a configurable policy:

- required: `username`, `password`
- optional/instance-dependent: `email`, `phone`
- login methods can be enabled per deployment: username, email, phone

This allows each deployment to decide identity rules without rewriting frontend forms.

### Push notifications

- **Service:** `services/notifications` (gateway path `/notifications`)
- **Web:** registers a Web Push subscription after login (`apps/web/public/sw.js`)
- **Messaging:** calls `POST /internal/push/message` when a chat message is created
- **Dev default:** `PUSH_DRY_RUN=true` in `services/notifications/.env` (logs only)
- **Production Web Push:** generate VAPID keys (`npx web-push generate-vapid-keys`), set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_DRY_RUN=false`
- **Android (FCM):** set `FCM_LEGACY_SERVER_KEY` and register tokens via `POST /push/fcm/register`

Run `pnpm db:migrate:deploy` so migration `20260525200000_push_subscriptions` is applied.

## Security Model

- TLS 1.3 for all transport links
- E2EE protocol lifecycle documented in `docs/security/e2ee-design.md`
- public vs corporate lawful access and user transparency: `docs/security/lawful-access-transparency.md`
- compliance runbooks (SIEM export): `docs/ops/compliance/README.md`
- optional privileged-access contour is isolated and audited in `services/access-audit`
- user transparency events are emitted for all privileged access reads (public profile)
- JWT bearer authentication for service endpoints
- password hashing with Argon2id (legacy bcrypt verified on login)
- secure API gateway baseline: Helmet, CORS allowlist, and rate limits
- RBAC for privileged access (`admin` role required for audit reads)
- media upload policy: MIME allowlist and upload size limits

## Deployment Profiles

The same codebase supports two operation modes:

- **Public cloud mode**: internet-facing entrypoint with strict CORS allowlist, reverse-proxy TLS termination, and external object storage.
- **Corporate mode**: internal DNS, private ingress/VPN, tighter policy defaults (private origins only, stricter firewalling, optional SIEM forwarding from audit events).

Detailed runbook and recommended controls: `docs/ops/deployment-profiles.md`.

## Git workflow

Daily work merges into **`develop`**; **`main`** receives tested releases (tags). See [docs/ops/git-branching.md](docs/ops/git-branching.md).

## Project Feedback And Contact

For feedback, collaboration, or deployment support:

- open an issue in this repository
- create a discussion/feature request
- contact maintainer via GitHub profile: [@sun-demon](https://github.com/sun-demon)

## Roadmap

See [docs/product/client-platform-roadmap.md](docs/product/client-platform-roadmap.md) for client order (web → push → Android → desktop → iOS).

- [x] Telegram-like web UI baseline
- [x] localization (RU/EN), theme switch, branding system
- [x] basic auth flow (register/login)
- [x] web admin MVP (install, complaints, encryption, SIEM export)
- [x] web messenger v1 core (actions, realtime, push backend)
- [ ] web polish (profile/auth edge cases, media UX)
- [ ] configurable auth providers (email/phone rules per deployment)
- [ ] production-grade session/token management
- [x] real push (Web Push + FCM legacy via `notifications`; set VAPID/FCM keys for production)
- [ ] full Android client integration
- [ ] desktop packaging (Tauri: Linux/Windows/macOS)
- [ ] release packaging and public install guide

## Built With

- TypeScript, React, Vite
- Node.js, Express, WebSocket
- Docker / Debian deployment target
- Cursor AI-assisted development workflow

Optional AI tools can also be used in research/prototyping phases (DeepSeek, ChatGPT, Gemini) depending on contributor preference.
