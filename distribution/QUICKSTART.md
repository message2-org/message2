# Message2 — быстрый старт (из репозитория)

Исходники: **https://github.com/message2-org/message2** (ветка `develop`).

## Требования

- Node.js 20+
- pnpm 9+
- Docker (PostgreSQL, Redis, MinIO)

## Установка

```bash
git clone https://github.com/message2-org/message2.git
cd message2
git checkout develop
pnpm install
```

## Запуск (разработка)

```bash
pnpm infra:up
pnpm db:migrate:deploy
pnpm dev:full
```

- Web-мессенджер: http://localhost:5173
- API gateway: http://localhost:4000
- Admin-консоль: http://localhost:5174

## Проверка версии

```bash
curl -s http://localhost:4000/version
pnpm distribution:check-updates
```

## Production (Debian VPS)

См. `docs/ops/deploy-debian-vps.md` в репозитории.

## Android-клиент

```bash
cd apps/android
./gradlew :app:assembleDebug
```

См. `apps/android/README.md`.
