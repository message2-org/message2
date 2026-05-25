# Client platform roadmap

Living plan for **which clients to build, and in what order**. Aligns with v1 in [requirements.md](./requirements.md) and priorities in [ai-context.md](../ai-context.md).

## Principle

Finish **one reference client** (web messenger) and **shared server contracts** before multiplying native codebases. Each new platform should reuse `@message2/contracts` types and stable HTTP/WS APIs — not re‑invent payloads.

`apps/admin` is a **separate operator console** (corporate/public compliance). It does not block the user messenger on mobile/desktop, but both should respect `DEPLOYMENT_PROFILE`.

## Recommended order

| Phase | Platform | Package | Goal |
|-------|----------|---------|------|
| **1** | Web messenger | `apps/web` | v1 feature-complete reference: chats, media, WS realtime, transparency UX, push (Web Push) |
| **1b** | Web admin (parallel / lower intensity) | `apps/admin` | Corporate install + complaints + encryption + SIEM — extend only when profile needs it |
| **2** | Push backend | `services/notifications` | Real FCM + Web Push (unblocks Android and web background alerts) |
| **3** | Android | `apps/android` | v1 native client (Kotlin + Compose); Keystore, pinning per [e2ee-design.md](../security/e2ee-design.md) |
| **4** | Desktop (Linux, Windows, macOS) | `apps/desktop` (planned) | Prefer **Tauri** (or similar) shell around `apps/web` for one UI codebase; full native UI only if coursework explicitly requires it |
| **5** | iOS | `apps/ios` (planned) | After Android patterns (auth, WS, media, push) are proven |

**Do not start** parallel full native trees (desktop Qt, iOS SwiftUI, Android) until Phase 1 API churn (push, optional E2EE milestones) is settled — otherwise you triple integration cost.

## What “done” means for Phase 1 (web)

Minimum before Android Phase 3:

- [x] Real push path wired (Track B — `notifications` + web subscription)
- [ ] Auth/session behavior acceptable for demo and both deployment profiles
- [ ] Media send/receive stable via `mediaId` (already largely done)
- [ ] WS reconnect and core chat flows reliable under `pnpm dev:full`
- [ ] Optional for v1 launch: full Double Ratchet E2EE (Track C — can trail Android if documented)

Admin Phase 1b: lawful P4–P6 MVP exists; further work is **profile-specific** (federation UI, connectivity modes) — not a prerequisite for Android.

## Desktop strategy (Linux / Windows / macOS)

For this monorepo, default recommendation:

1. **Tauri 2** (or Electron if team prefers): package existing Vite web build, system tray, deep links, auto-update later.
2. **Native desktop UI** (Qt/GTK/.NET MAUI): only if thesis or employer mandates separate native UX — budget 3–5× web effort.

All desktop profiles still use the same gateway, TLS, and corporate/public policy as web.

## Android vs desktop vs iOS

| Factor | Android (Phase 3) | Desktop (Phase 4) | iOS (Phase 5) |
|--------|---------------------|-------------------|---------------|
| Product v1 | Required in [requirements.md](./requirements.md) | Not in v1 scope | v2 / post‑Android |
| Effort | New codebase, FCM, Keystore | Low if Tauri; high if native | Apple dev account, APNs, Swift/KMP |
| Reuse from web | API/WS patterns, contracts | Can embed web UI entirely | Similar to Android server integration |

**Your proposed order (web → admin alongside → Android → Linux/Windows → rest) is correct.** Swap only if coursework grading weights desktop over mobile.

## Shared work before `apps/android` grows

- Keep `packages/contracts` as the single schema source.
- Document WS event names and auth headers in one place (consider `docs/product/api-client-guide.md` when Android starts).
- Implement FCM in `notifications` once; Android and future iOS consume the same orchestration.

## Out of scope (until v2)

- Custom themes, channels/bots, sticker packs (see requirements v2)
- Federation admin UI (corporate connectivity — documented, not coded)
- Separate native desktop without shell (unless explicitly chosen)

## Related docs

- [requirements.md](./requirements.md) — v1/v2 feature lists
- [e2ee-design.md](../security/e2ee-design.md) — per-platform key storage
- [deployment-profiles.md](../ops/deployment-profiles.md) — public vs corporate behavior
- [ai-context.md](../ai-context.md) — active tracks and handoff
