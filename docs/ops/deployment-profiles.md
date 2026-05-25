# Deployment profiles: corporate and public

## Goal

This document maps Message2 to the coursework requirement: a secure client-server messaging and multimedia system deployable in both corporate and public environments.

## Public profile (internet-facing)

- Lawful-access and user transparency policy: [lawful-access-transparency.md](../security/lawful-access-transparency.md) (`DEPLOYMENT_PROFILE=public`, `LAWFUL_ACCESS_ENABLED=true`).
- API gateway exposed via reverse proxy on `443` only.
- TLS 1.3 termination, HSTS, and automatic certificate renewal.
- `CORS_ALLOWED_ORIGINS` set to explicit public client domains.
- WAF / DDoS layer in front of ingress.
- Object storage and backups in separate availability zones.

## Corporate profile (private perimeter)

- External lawful-access API **disabled**; state transparency UI off by default — see [lawful-access-transparency.md](../security/lawful-access-transparency.md).
- **Encryption policy is admin-configurable** per instance/chat (from `metadata_only` up to `e2ee_strict`); no mandatory maximum — customer chooses in Admin Console.
- **Connectivity mode** (install-time, auditable): `isolated` (single server) | `federation` (trusted corporate peers only) | `public_bridge` (controlled link to a public instance). Default recommended: `isolated` or `federation` without public bridge.
- Access through VPN or private WAN only.
- Internal PKI certificates and private DNS zones.
- Firewall allows only required east-west service links.
- SIEM forwarding from audit and access logs.
- Optional split deployment across trusted network segments.

## Security baseline in code

- Password hashing: Argon2id in `services/messaging` (with lazy migration from legacy bcrypt hashes).
- JWT-based API authentication for messaging/media/audit services.
- Role-based privileged actions (`admin` role required for audit reads).
- API hardening: Helmet and rate-limiting in entry services.
- Media upload controls: MIME allowlist + max size.
- Private profile fields (`email`, `phone`) encrypted in `services/messaging` with key-versioned envelope encryption.

## Recommended environment variables

- `JWT_SECRET`: strong random secret (required in production).
- `CORS_ALLOWED_ORIGINS`: comma-separated allowed origins for gateway.
- `MESSAGING_URL`, `MEDIA_URL`, `NOTIFICATIONS_URL`, `AUDIT_URL`: internal service routing.

## Verification checklist

- Auth endpoints return JWT and reject bad credentials.
- Protected endpoints reject requests without Bearer token.
- Non-admin token cannot call privileged audit endpoints.
- Upload endpoint rejects disallowed MIME types and oversized files.
- Gateway only allows configured CORS origins.
