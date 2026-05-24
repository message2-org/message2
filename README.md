# Message2 / Послание2

<p align="center">
  <img src="apps/web/public/brand/logo.svg" alt="Message2 logo" width="104" height="104">
</p>

Secure multimedia messenger for Web and Android with E2EE-first architecture.
Coursework focus: secure client-server system for corporate and public deployment scenarios.

## About

Message2 (Russian locale name: "Послание2") is a modular messenger platform focused on privacy, modern UI, and self-hosted Debian deployment.

- Web app: React + TypeScript (`apps/web`)
- Planned Android app: Kotlin + Compose (`apps/android`)
- API and services: Node.js + TypeScript (`services/*`)
- Local/dev deployment: Docker Compose (`infra/docker`)

Repository: [github.com/sun-demon/message2](https://github.com/sun-demon/message2)

## Monorepo Structure

- `apps/web` - React web client
- `apps/android` - native Android client (Kotlin + Compose, planned/ongoing)
- `services/api-gateway` - API entrypoint and routing
- `services/messaging` - users/chats/messages + realtime
- `services/media` - media upload and preview pipeline
- `services/notifications` - push and in-app notification orchestration
- `services/access-audit` - privileged access API, audit, transparency events
- `infra/docker` - local/prod container orchestration
- `infra/observability` - Prometheus/Grafana setup
- `docs` - product, security, operations, test plans
- `docs/ai-context.md` - living implementation status and priorities (for contributors and AI assistants)
- `AGENTS.md` - concise agent onboarding (commands, service map, do-not-commit rules)

## AI-assisted development

When using Cursor or other AI tools on this repo:

1. Read [docs/ai-context.md](docs/ai-context.md) for current stack, scripts, and active tasks.
2. Follow the immutable coursework topic in [.cursor/rules/coursework-context.mdc](.cursor/rules/coursework-context.mdc).
3. Use [AGENTS.md](AGENTS.md) for commands and local service ports.

After meaningful changes, update sections 2–5 in `docs/ai-context.md` (not section 1).

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

## Security Model

- TLS 1.3 for all transport links
- E2EE protocol lifecycle documented in `docs/security/e2ee-design.md`
- optional privileged-access contour is isolated and audited in `services/access-audit`
- user transparency events are emitted for all privileged access reads
- JWT bearer authentication for service endpoints
- password hashing with bcrypt in auth flow
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

- [x] Telegram-like web UI baseline
- [x] localization (RU/EN), theme switch, branding system
- [x] basic auth flow (register/login)
- [ ] configurable auth providers (email/phone rules per deployment)
- [ ] production-grade session/token management
- [ ] full Android client integration
- [ ] release packaging and public install guide

## Built With

- TypeScript, React, Vite
- Node.js, Express, WebSocket
- Docker / Debian deployment target
- Cursor AI-assisted development workflow

Optional AI tools can also be used in research/prototyping phases (DeepSeek, ChatGPT, Gemini) depending on contributor preference.
