# Secure backend blueprint (Node.js + PostgreSQL)

This blueprint defines a production-oriented backend stack for Message2 under the coursework theme:
secure client-server messaging and multimedia exchange, deployable in both public and corporate environments.

## 1) Recommended stack

- Runtime: Node.js 22 LTS + TypeScript
- Services: keep current service split (`api-gateway`, `messaging`, `media`, `notifications`, `access-audit`)
- Framework style: Express is acceptable short-term; target Fastify or NestJS for long-term maintainability
- Database: PostgreSQL 16+
- ORM/migrations: Prisma (recommended for team speed)
- Cache/queues: Redis + BullMQ
- Media storage: S3-compatible object storage (MinIO for self-hosted corporate profile, S3 in public profile)
- Secrets and keys: Vault or cloud KMS (AWS KMS / GCP KMS / Azure Key Vault)
- Observability: OpenTelemetry + Prometheus/Grafana + centralized logs

## 2) Security model (encryption by layers)

### In transit

- TLS 1.3 at ingress, HSTS for public profile
- mTLS for east-west traffic in corporate profile (recommended baseline)

### At rest

- Encrypted disk/volume for DB and object storage nodes
- Encrypted backups and WAL archives

### In database

- Not "encrypt everything in SQL blindly"; use data classification:
  - Class A (sensitive): personal identifiers, private contact data, keying metadata -> application-level encryption
  - Class B (operational): IDs, timestamps, delivery flags -> plaintext for indexing and analytics
- Use envelope encryption:
  - DEK (data encryption key) encrypts value/file
  - KEK (key encryption key) in KMS encrypts DEK
  - store `key_version` with encrypted payload for rotation

### Passwords and auth

- Password hashing: Argon2id (replace bcrypt baseline)
- Optional server-side pepper from secret manager
- Access token: short-lived JWT (10-15m)
- Refresh token: rotation + revoke list in Redis/Postgres

## 3) PostgreSQL target schema (v1)

Core tables and intent:

- `users`
  - `id uuid pk`
  - `username citext unique`
  - `display_name text`
  - `password_hash text`
  - `role text check (role in ('user','admin'))`
  - `created_at timestamptz`

- `user_private_profile` (encrypted fields)
  - `user_id uuid pk references users(id)`
  - `email_enc bytea null`
  - `phone_enc bytea null`
  - `dek_wrapped bytea`
  - `key_version int`
  - `updated_at timestamptz`

- `refresh_sessions`
  - `id uuid pk`
  - `user_id uuid references users(id)`
  - `token_hash text unique`
  - `expires_at timestamptz`
  - `revoked_at timestamptz null`
  - `created_at timestamptz`

- `chats`
  - `id uuid pk`
  - `title text`
  - `kind text check (kind in ('direct','group'))`
  - `created_by uuid references users(id)`
  - `created_at timestamptz`

- `chat_members`
  - `chat_id uuid references chats(id)`
  - `user_id uuid references users(id)`
  - `joined_at timestamptz`
  - primary key (`chat_id`, `user_id`)

- `messages`
  - `id uuid pk`
  - `chat_id uuid references chats(id)`
  - `sender_id uuid references users(id)`
  - `kind text`
  - `cipher_text text` (E2EE envelope payload from client)
  - `media_id uuid null`
  - `sent_at timestamptz`
  - `edited_at timestamptz null`
  - `deleted_at timestamptz null`

- `media_objects`
  - `id uuid pk`
  - `owner_id uuid references users(id)`
  - `storage_key text unique`
  - `mime text`
  - `size_bytes bigint`
  - `preview_status text`
  - `dek_wrapped bytea`
  - `key_version int`
  - `created_at timestamptz`

- `audit_events` (append-only)
  - `id uuid pk`
  - `event_type text`
  - `actor_user_id uuid null`
  - `target_chat_id uuid null`
  - `reason text`
  - `created_at timestamptz`

Indexes to add first:

- `messages(chat_id, sent_at desc)`
- `chat_members(user_id, chat_id)`
- `refresh_sessions(user_id, expires_at)`
- `audit_events(created_at desc)`

## 4) Service-to-data ownership

- `messaging` owns: `users`, `user_private_profile`, `refresh_sessions`, `chats`, `chat_members`, `messages`
- `media` owns: `media_objects` + object storage
- `access-audit` owns: `audit_events`
- `notifications` can stay stateless initially (or have notification history table later)
- `api-gateway` remains stateless routing + policy enforcement

## 5) Required environment variables by service

Shared:

- `NODE_ENV=production`
- `JWT_SECRET` (or asymmetric JWT keys)
- `DATABASE_URL` (service-specific DB user)
- `REDIS_URL`
- `KMS_PROVIDER` (`vault`, `aws`, `gcp`, `azure`)
- `KMS_KEY_ID`
- `ENCRYPTION_KEY_VERSION`

Messaging:

- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL=30d`
- `ARGON2_MEMORY_KB`
- `ARGON2_TIME_COST`
- `ARGON2_PARALLELISM`

Media:

- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `MEDIA_MAX_SIZE_MB`

Gateway:

- `CORS_ALLOWED_ORIGINS`
- `MESSAGING_URL`
- `MEDIA_URL`
- `NOTIFICATIONS_URL`
- `AUDIT_URL`

## 6) Public vs corporate profile mapping

Public profile:

- internet-facing reverse proxy on 443 only
- external WAF/DDoS, managed certificates, multi-AZ backups
- stricter anti-abuse and rate limits per IP/device

Corporate profile:

- private ingress (VPN/WAN), internal PKI
- mTLS by default between services
- SIEM forwarding mandatory (`audit_events`, auth failures, admin actions)
- support for stricter policy (username-only or AD/LDAP/SSO integration)

## 7) Migration plan from current implementation

Phase 1 (foundation):

1. Introduce Prisma schema and migrations for tables above.
2. Add Postgres and Redis to local/dev deployment.
3. Replace in-memory maps in `messaging` with repository layer.

Phase 2 (auth/session hardening):

1. Replace bcrypt with Argon2id for new passwords.
2. Implement refresh token rotation and revoke list.
3. Add login anomaly/audit events.

Phase 3 (encryption hardening):

1. Add crypto module with envelope encryption (KMS/Vault-backed KEK).
2. Encrypt Class A fields in `user_private_profile`.
3. Encrypt media file DEKs and persist wrapped keys.

Phase 4 (operational readiness):

1. Add DB backup + restore drills (target RPO/RTO from requirements).
2. Add OpenTelemetry traces and security dashboards.
3. Add chaos/failure tests for DB and object storage outages.

## 8) Code-level immediate improvements (current repo)

1. Keep current E2EE `cipherText` flow for message payloads.
2. Move persistent state from encrypted local file to PostgreSQL.
3. Keep `access-audit` append-only; prevent update/delete endpoints.
4. Add `x-request-id` propagation from gateway to all services.
5. Enforce strict CORS in every externally reachable entry service.

## 9) Definition of done (production-ready baseline)

- No secrets in repo; all runtime secrets from env/secret manager
- Postgres + Redis + object storage wired in all relevant services
- Sensitive fields encrypted with key versioning and documented rotation
- Refresh token rotation active and revocation tested
- Audit trail immutable and exported to SIEM
- Backup restore test confirms RPO/RTO targets from requirements
