# Security operations checklist

Operational checklist for secure day-to-day maintenance of Message2 in public and corporate deployments.

## Daily checks

- Verify all services are healthy and reachable through intended perimeter only.
- Check failed auth spikes and unusual refresh-token churn.
- Validate `GET /metrics` from `messaging`:
  - `message2_key_rotation_remaining_profiles`
  - `message2_key_rotation_total_processed`
  - `message2_key_rotation_total_rotated`
- Review `access-audit` privileged events for unexpected activity.
- Confirm no secrets are logged in application logs.

## Weekly checks

- Run backup restore test for PostgreSQL metadata.
- Verify object storage restore path for media and previews.
- Review admin role assignments and remove stale privileged users.
- Confirm TLS certificates and internal PKI certs are within renewal windows.
- Validate CORS allowlist and gateway exposure rules.

## Key management checks

- Ensure active encryption key version matches deployment intent.
- During rotation, track `remaining` via `GET /admin/crypto/rekey-status`.
- Remove previous key only after:
  - `remaining=0`
  - private profile read/write smoke tests pass
- Record key rotation event in change log and incident/audit system.

## Release checks

- Confirm all migrations applied successfully before traffic cutover.
- Validate auth flow:
  - register/login/refresh/logout/logout-all
- Validate private profile flow:
  - `PUT /auth/private-profile`
  - `GET /auth/private-profile`
- Verify admin-only controls are inaccessible to non-admin tokens.
- Ensure rate limits and security headers remain enabled.

## Corporate profile additions

- Validate SIEM forwarding for audit and auth security events.
- Confirm east-west policy and mTLS trust chain integrity.
- Recheck VPN/private ingress enforcement after network changes.

## Public profile additions

- Recheck WAF/DDoS policy and anomaly alerts.
- Verify HSTS and TLS 1.3 posture at public ingress.
- Confirm only approved domains are in `CORS_ALLOWED_ORIGINS`.
