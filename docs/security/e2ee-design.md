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
