# Nginx templates for Message2

Static layout served by nginx on every instance (official domains, corporate IPs, self-hosted VPS):

| Path | Content |
|------|---------|
| `/` | Landing (`apps/site/dist`) |
| `/app/` | Web messenger (`apps/web/dist`, build with `--base=/app/`) |
| `/messaging/` | API gateway (`127.0.0.1:4000`) |
| `/messaging/ws` | WebSocket → messaging (`127.0.0.1:4001/ws`) |
| `/media/`, `/notifications/` | API gateway |
| `/downloads/` | Release artifacts (`.deb`, `.apk`, …) when published |

## Build assets

```bash
cd /opt/message2
pnpm install
pnpm build:public-web
```

`build:public-web` runs `build:site` + `build:web:app`.

## Install config (Debian/Ubuntu)

1. Copy `message2.conf.template` to `/etc/nginx/sites-available/message2`.
2. Replace `__MESSAGE2_ROOT__` with `/opt/message2` (or your install path).
3. For TLS + domains, set `server_name` to your hostnames (see template comments).
4. Enable site:

```bash
ln -s /etc/nginx/sites-available/message2 /etc/nginx/sites-enabled/message2
nginx -t && systemctl reload nginx
```

## TLS (official domains)

```bash
certbot --nginx \
  -d message2.ru -d www.message2.ru \
  -d xn--80aaf6a3a.xn--p1ai -d www.xn--80aaf6a3a.xn--p1ai
```

## IP-only instances

Keep the `default_server` block on port 80 in the template. HTTPS on a raw IP requires a private CA or HTTP-only access.

## Local preview

```bash
pnpm dev:site    # :5175 landing
pnpm dev:web     # :5173 web client (dev proxy)
```
