# Production readiness status

Current status snapshot for Message2 based on the implemented repository state.

## 1) Architecture and runtime

- [x] Monorepo service split is in place (`api-gateway`, `messaging`, `media`, `notifications`, `access-audit`).
- [x] Gateway hardening baseline is present (Helmet + rate limiting + CORS policy).
- [x] Messaging service is stateful on PostgreSQL (Prisma schema + migrations introduced).
- [ ] Redis-backed queues/sessions are not yet introduced.
- [ ] Dedicated background workers are not separated from API process yet.

## 2) Authentication and session security

- [x] JWT access + refresh model is implemented.
- [x] Refresh token rotation is implemented.
- [x] Logout and logout-all session revocation endpoints are implemented.
- [x] Password hashing uses Argon2id for new hashes.
- [x] Lazy migration from legacy bcrypt hashes is implemented on successful login.
- [ ] Asymmetric JWT keys (private/public keypair) are not implemented yet.
- [ ] Device-bound/session fingerprint policy is not fully enforced yet.

## 3) Encryption and key management

- [x] Message payload flow is compatible with encrypted envelope storage (`cipherText`).
- [x] Sensitive private profile fields (`email`, `phone`) are encrypted at application level.
- [x] Key versioning is implemented for private profile encryption.
- [x] Manual key rotation endpoint is implemented.
- [x] Automatic background key rotation worker is implemented.
- [x] Key-rotation status endpoint and metrics endpoint are implemented.
- [ ] External KMS/Vault integration is not implemented yet (currently env-secret based).
- [ ] Formal key custody/rotation approvals are not automated in CI/CD.

## 4) Data model and persistence

- [x] Core entities exist in PostgreSQL (`User`, `Chat`, `ChatMember`, `Message`, `RefreshSession`).
- [x] Private profile encrypted table exists (`UserPrivateProfile`).
- [x] Initial migrations are stored in repository.
- [ ] `media` and `access-audit` persistence are not yet moved to PostgreSQL/object storage in the same depth.
- [ ] DB role separation (per-service least privilege users) is not yet documented and enforced.

## 5) Observability and operations

- [x] Key-rotation operational runbook exists.
- [x] Security operations checklist exists.
- [x] Prometheus-compatible metrics endpoint exists in messaging service.
- [ ] Centralized structured logging and trace correlation are not fully implemented across all services.
- [ ] Alerting rules (SLO/security) are not yet codified.
- [ ] SIEM forwarding integration is not yet implemented end-to-end.

## 6) Deployment and environment hardening

- [x] Public/corporate deployment profile guidance exists in docs.
- [x] Debian VPS deployment guidance exists in docs.
- [ ] Secrets manager integration is not implemented (Vault/KMS runtime retrieval).
- [ ] mTLS service-to-service policy is not implemented yet.
- [ ] WAF/DDoS and ingress hardening are documented but not validated by automated checks.

## 7) Testing and verification

- [x] Basic service test scaffolding exists.
- [ ] Auth/session regression tests for rotation/revocation are incomplete.
- [ ] Crypto regression tests (encrypt/decrypt/rotate edge cases) are incomplete.
- [ ] Restore drill automation for RPO/RTO objectives is not implemented.

## 8) Immediate next milestones

1. Integrate Vault/KMS for master key retrieval and rotation ceremony.
2. Add Redis for session/introspection and queue-backed background processing.
3. Move `media` persistence to object storage + metadata DB table with encryption metadata.
4. Move `access-audit` events to append-only PostgreSQL table with retention and export.
5. Add integration tests for auth, private profile crypto, and key rotation.
6. Add baseline alerting and dashboards for auth anomalies and rotation health.
