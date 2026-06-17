# Debian VPS deployment guide

Repository: `https://github.com/message2-org/message2` (branch `develop`).

## 1. Prepare server

- Install Docker Engine + Docker Compose plugin.
- Install Node.js 22+ and enable pnpm (`corepack enable`).
- Create a non-root deploy user (any name, e.g. `daniil`) and disable password auth for SSH.
- Configure firewall (22, 80, 443 only).

## 2. DNS and TLS

- Point `message2.ru` and `послание2.рф` (`xn--80aaf6a3a.xn--p1ai`) to VPS IP.
- Terminate TLS with Nginx/Traefik and Let's Encrypt.

## 3. Install application

```bash
sudo mkdir -p /opt/message2
sudo chown $USER:$USER /opt/message2
git clone https://github.com/message2-org/message2.git /opt/message2
cd /opt/message2 && git checkout develop
pnpm install
```

Configure secrets in `infra/docker/.env` (see `infra/docker/.env.example` + production secrets).

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate:deploy
pnpm build:public-web
```

## 4. Nginx (landing + web + API)

Every deployed instance serves:

- `/` — product landing (`apps/site`)
- `/app/` — web messenger
- `/messaging/` — API gateway

See [infra/nginx/README.md](../infra/nginx/README.md) for templates (works on official domains **and** IP-only corporate hosts).

```bash
sed "s|__MESSAGE2_ROOT__|/opt/message2|g" infra/nginx/message2-locations.conf | sudo tee /etc/nginx/snippets/message2-locations.conf
sed "s|__MESSAGE2_ROOT__|/opt/message2|g" infra/nginx/message2.conf.template | sudo tee /etc/nginx/sites-available/message2
sudo ln -sf /etc/nginx/sites-available/message2 /etc/nginx/sites-enabled/message2
sudo nginx -t && sudo systemctl reload nginx
```

TLS:

```bash
sudo certbot --nginx -d message2.ru -d www.message2.ru -d xn--80aaf6a3a.xn--p1ai -d www.xn--80aaf6a3a.xn--p1ai
```

## 5. Environment

- `JWT_SECRET`, `DATA_ENCRYPTION_MASTER_KEY`, `INTERNAL_SERVICE_SECRET` — strong random values in `infra/docker/.env`.
- `MESSAGE2_DEPLOYMENT_PROFILE=public|corporate` — same stack, different policy.
- `CORS_ALLOWED_ORIGINS` — set when exposing web on a public origin (gateway).

## 6. Backups

- PostgreSQL PITR with daily base backup + WAL archive.
- Object storage lifecycle policy and offsite mirror.
- Weekly restore drill to verify RTO/RPO objectives.

## 7. Second VPS (optional)

- Use as read replica and failover target.
- Configure media proxy/CDN edge and backup ingress.

## 8. Corporate/private adaptation

- Replace public DNS with internal zones.
- Limit ingress to VPN/private network.
- Export `access-audit` logs into corporate SIEM.
- Keep the same app stack; switch policy through env and perimeter controls.
- Landing page and `/app/` work on private IPs via nginx `default_server` (HTTP).
