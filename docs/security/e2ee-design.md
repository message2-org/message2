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
