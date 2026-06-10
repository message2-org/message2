# Android client (Kotlin + Jetpack Compose)

Native messenger MVP aligned with `apps/web` core flows.

## Features (MVP)

- Login / register (`/auth/login`, `/auth/register`)
- Session restore + refresh rotation (DataStore)
- Chat list (`GET /chats`)
- DM chat timeline + send text (`GET/POST /chats/:id/messages`)
- Discover users + start DM (`GET /discover`, `POST /chats`)
- WebSocket realtime for `message.created`
- Deployment profile hint (`GET /instance/profile`)

Not in this slice: E2EE decrypt, media upload, push (FCM), reactions/edit — follow web reference client.

## Run locally

1. Start backend on the host: `pnpm infra:up && pnpm dev:backend:core` (or `pnpm dev:full`).
2. Open `apps/android` in Android Studio (Ladybug+ recommended) or use CLI below.
3. **Emulator:** default `BuildConfig.API_BASE_URL` is `http://10.0.2.2:4000/messaging` (host loopback).
4. **Physical device:** change `API_BASE_URL` / `API_FALLBACK_URL` in `app/build.gradle.kts` to your PC LAN IP, e.g. `http://192.168.1.10:4000/messaging`.

```bash
cd apps/android
./gradlew :app:assembleDebug
./gradlew :app:installDebug   # device/emulator connected
```

Cleartext HTTP is allowed only for dev hosts (`10.0.2.2`, `localhost`) via `network_security_config.xml`. Production builds should use TLS + certificate pinning (see `docs/security/e2ee-design.md`).

## Module layout (current)

- `app` — Compose UI, OkHttp API client, WebSocket, session store
- Planned: `core-crypto`, `feature-chat`, `feature-media` (see roadmap)

## Related

- [client-platform-roadmap.md](../../docs/product/client-platform-roadmap.md)
- Web reference: `apps/web`
