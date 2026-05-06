# Debian VPS deployment guide

## 1. Prepare server

- Install Docker Engine + Docker Compose plugin.
- Create deploy user and disable password auth for SSH.
- Configure firewall (22, 80, 443 only).

## 2. DNS and TLS

- Point `message2.ru` and `xn--80aaf6a3a.xn--p1ai` to VPS IP.
- Terminate TLS with Nginx/Traefik and Let's Encrypt.

## 3. Run stack

- Copy repository to `/opt/message2`.
- Configure `.env` with:
  - `JWT_SECRET=<strong-random-value>`
  - `CORS_ALLOWED_ORIGINS=https://your-domain.example`
- Run:
  - `docker compose -f infra/docker/docker-compose.yml up -d`
- Add systemd unit for auto-restart at boot.

## 4. Backups

- PostgreSQL PITR with daily base backup + WAL archive.
- Object storage lifecycle policy and offsite mirror.
- Weekly restore drill to verify RTO/RPO objectives.

## 5. Second VPS (optional)

- Use as read replica and failover target.
- Configure media proxy/CDN edge and backup ingress.

## 6. Corporate/private adaptation

- Replace public DNS with internal zones.
- Limit ingress to VPN/private network.
- Export `access-audit` logs into corporate SIEM.
- Keep the same app stack; switch policy through env and perimeter controls.
