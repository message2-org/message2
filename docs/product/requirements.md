# Product requirements (v1/v2)

## v1 scope

- Registration/login via phone or email + password.
- One-to-one and group chats.
- Message types: text, image, video, audio, generic file.
- Message actions: edit, delete, reply, react.
- Media preview cards for images/video/audio.
- Read receipts, typing indicator, online presence.
- Push notifications for Android/Web.
- Light/Dark themes.

## v2 scope

- Custom themes.
- Channels and bot integrations.
- Sticker packs and GIF panel.
- Multi-device management UI.
- Advanced moderation/admin features.

## Deployment profiles (public vs corporate)

Two operation modes from the same codebase (see `docs/ops/deployment-profiles.md`):

| Profile | Audience | Lawful / state access | Encryption |
|---------|----------|----------------------|------------|
| **Public** | Internet, general users | Mandatory structured lawful API, user transparency, tombstones, complaints | Hybrid modes; honesty to users about what server can read |
| **Corporate** | Organization perimeter | No external lawful API; internal audit/SIEM optional | **Admin-configurable** (`metadata_only` … full E2EE), not forced maximum |

Corporate connectivity (install-time, auditable): `isolated` | `federation` (peer servers) | `public_bridge` (optional). Default: no bridge to public.

**Implementation status:** [lawful-access-implementation-status.md](../security/lawful-access-implementation-status.md)  
**Full policy/spec:** [lawful-access-transparency.md](../security/lawful-access-transparency.md)  
**Client build order (web, mobile, desktop):** [client-platform-roadmap.md](./client-platform-roadmap.md)

**Integration quality:** feature branches merge to `develop` only after green CI (`pnpm build && pnpm test`). See [agent-coordination.md](../ops/agent-coordination.md).

### Public profile — functional requirements (v2+)

- Lawful operations rejected without `legalRef`, `reasonCode`, and minimum-length `reasonText`.
- Narrow scope: explicit chat/message/user IDs or bounded time range.
- Immutable audit log for every privileged read/export/restrict/delete.
- User transparency: mandatory in-app notice; per-message indicator when applicable; tombstone after privileged delete.
- User can view disclosure summary (`full` / `partial` / `sealed`) and file complaint to platform compliance (not to state bodies via app).
- Push for transparency optional; in-app record not optional on public profile.

### Corporate profile — functional requirements (v2+)

- No user-facing “state access” badges unless customer enables internal transparency.
- Instance admin sets encryption defaults and optional per-chat policies.
- Optional federation between trusted corporate instances (mTLS, allowlist).

## Non-functional requirements (SLA/SLO)

- API availability: 99.9% monthly.
- Message send p95 latency: <= 400ms in one region.
- Realtime delivery p95 after enqueue: <= 200ms.
- File upload success ratio: >= 99.5%.
- RPO for metadata: <= 15 minutes.
- RTO for primary region restore: <= 60 minutes.
