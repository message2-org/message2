# E2EE design (baseline)

## Protocol pieces

- Identity key pair per user device.
- Signed prekeys and one-time prekeys published to server.
- Session bootstrap via X3DH-like handshake.
- Message encryption using Double Ratchet state per peer/device.

## Group strategy

- Sender keys per group epoch.
- Epoch rotation on membership change.
- Device list sync and per-device fanout envelopes.

## Key lifecycle

- Device keys generated client-side only.
- Private keys stored in Android Keystore / Web secure storage.
- Session reset flow for compromised device.
- Backup keys optional and user-controlled.

## Server trust boundaries

- Server stores ciphertext, envelope metadata, and delivery receipts.
- Server never receives plaintext content keys.
- Privileged access can only read metadata by default.

## Public encryption modes (deployment profile)

On `DEPLOYMENT_PROFILE=public`, the instance may use a hybrid model (`e2ee_strict`, `server_encrypted`, `metadata_only`) so lawful access and user transparency remain technically consistent. **Corporate** profile: the instance admin sets defaults and per-chat ceilings/floors (`metadata_only` … `e2ee_strict`); stronger modes are encouraged but not mandatory. See [lawful-access-transparency.md](./lawful-access-transparency.md) §7.

## DM wire format (Track C v1)

DM messages in `e2ee_strict` use `Message.cipherText` prefixed with `m2e2:v1:` followed by base64url JSON (`packages/contracts/src/e2ee/codec.ts`).

| Payload `t` | When sent | Purpose |
|-------------|-----------|---------|
| `x3dh_init` | First message from initiator | X3DH handshake envelope (identity + ephemeral, used SPK/OPK ids) |
| `x3dh_response` | Optional ack from responder | Responder identity + ephemeral (session bootstrap ack) |
| `msg` | Every encrypted body | Double Ratchet ciphertext (`header.n`, `header.pn`, `header.dhPublic`, `ciphertext`, `nonce`) |

Web client helpers: `apps/web/src/e2ee/dm-wire.ts` (`prepareOutgoingCipherTexts`, `decodeIncomingCipherText`). Crypto: Web Crypto X25519 + Ed25519 + AES-GCM + HKDF labels in `packages/contracts/src/e2ee/constants.ts`.

## Prekey API (messaging service)

Authenticated routes on `@message2/messaging`:

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/e2ee/devices/:deviceId/bundle` | Publish identity + signed prekey + optional one-time prekeys (`deviceId` in URL only) |
| `GET` | `/e2ee/me/devices` | List caller device summaries |
| `GET` | `/e2ee/users/:userId/bundle?deviceId=…&dm_peer_required=true` | Fetch peer bundle; consumes one OPK; `dm_peer_required` returns `403` unless users share a 2-member DM chat |

Prisma: `UserDevice`, `DeviceOneTimePrekey` (`services/messaging/prisma/schema.prisma`). Local device material: `localStorage` key `message2:e2ee:device` (web).
