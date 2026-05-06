# Key rotation runbook (messaging private profile encryption)

This runbook describes zero-downtime rotation for encrypted private profile fields in `services/messaging`.

## Scope

- Protected data: `email` and `phone` in `UserPrivateProfile`.
- Encryption model: envelope encryption with `keyVersion`.
- Rotation modes:
  - manual: admin endpoint trigger
  - automatic: background batch worker

## Prerequisites

- Deploy version that supports:
  - `DATA_ENCRYPTION_MASTER_KEY_PREVIOUS`
  - `ENCRYPTION_KEY_VERSION`
  - `POST /admin/crypto/rekey-private-profiles`
  - `GET /admin/crypto/rekey-status`
  - `GET /metrics`
- Keep current and previous key material in secret manager (never in git).

## Environment variables

- `DATA_ENCRYPTION_MASTER_KEY`: new active master key.
- `DATA_ENCRYPTION_MASTER_KEY_PREVIOUS`: previous key for backward decryption during migration.
- `ENCRYPTION_KEY_VERSION`: new target version (increment by 1 or more).
- `KEY_ROTATION_BATCH_SIZE`: profiles per batch.
- `KEY_ROTATION_AUTO_ENABLED`: `true`/`false`.
- `KEY_ROTATION_INTERVAL_MS`: background interval in milliseconds.
- `KEY_PROVIDER`: `env` or `vault`.
- `KEY_PROVIDER_RETRY_INTERVAL_MS`: retry interval for key provider re-initialization when provider is unavailable at startup.
- Vault mode:
  - `VAULT_ADDR`
  - `VAULT_TOKEN`
  - `VAULT_KV_PATH` (KV v2 path, for example `secret/data/message2/messaging`)
  - `VAULT_CURRENT_SECRET_FIELD`
  - `VAULT_PREVIOUS_SECRET_FIELD`

## Zero-downtime rotation procedure

1. Generate new key in KMS/Vault and publish to runtime secret manager.
2. Set:
   - `DATA_ENCRYPTION_MASTER_KEY=<new>`
   - `DATA_ENCRYPTION_MASTER_KEY_PREVIOUS=<old>`
   - `ENCRYPTION_KEY_VERSION=<new-version>`
3. Deploy service.
4. Run rotation until completion:
   - Manual mode: call `POST /admin/crypto/rekey-private-profiles` repeatedly.
   - Auto mode: enable worker and observe progress.
5. Verify `remaining=0` from `GET /admin/crypto/rekey-status`.
6. Remove `DATA_ENCRYPTION_MASTER_KEY_PREVIOUS`.
7. Redeploy and validate read/write of private profile endpoints.

## Validation checklist

- `GET /admin/crypto/rekey-status`:
  - `remaining` reaches `0`
  - `targetKeyVersion` equals desired version
- `GET /health/crypto` returns `200` with `keysReady=true` before rotation operations.
- `GET /health/ready` returns `200` before marking service instance as ready for traffic.
- `GET /metrics`:
  - `message2_key_rotation_remaining_profiles` reaches `0`
  - counters `message2_key_rotation_total_processed` and `message2_key_rotation_total_rotated` move as expected
- Functional:
  - `PUT /auth/private-profile` succeeds
  - `GET /auth/private-profile` returns expected values

## Prometheus scrape example

```yaml
scrape_configs:
  - job_name: message2-messaging
    metrics_path: /metrics
    static_configs:
      - targets: ["messaging:4001"]
```

## Failure handling

- If some rows fail to rotate:
  - keep `DATA_ENCRYPTION_MASTER_KEY_PREVIOUS` configured
  - continue running batch endpoint/worker
  - inspect problematic rows from service logs and recover manually
- Do not remove previous key until `remaining=0` and verification passes.
- If key provider is temporarily unavailable:
  - service stays up
  - crypto-dependent endpoints return `503` until keys are initialized
  - readiness endpoints (`/health/crypto`, `/health/ready`) return `503`
  - monitor `message2_key_provider_ready` metric and `GET /admin/crypto/rekey-status`
