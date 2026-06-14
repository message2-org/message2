# Message2 / Послание2 — архив дистрибуции

Этот архив **не содержит полный исходный код**. Он фиксирует версию сборки и указывает, где скачать актуальные исходники и как их обновить.

## Канонический репозиторий

**https://github.com/message2-org/message2**

```bash
git clone https://github.com/message2-org/message2.git
cd message2
git checkout develop
```

## Версия этого архива

| Поле | Значение |
|------|----------|
| Версия продукта | `{{VERSION}}` |
| Git commit | `{{COMMIT}}` |
| Собран | `{{GENERATED_AT}}` |

Подробности компонентов — в `manifest.json` в этой папке.

## Быстрый старт

См. `QUICKSTART.md` (установка Docker, `pnpm install`, запуск стека).

## Проверка обновлений

```bash
node check-updates.mjs
```

Скрипт сравнивает локальный `manifest.json` с актуальным манифестом в ветке `develop` на GitHub.

Код выхода:

- `0` — обновлений нет
- `2` — доступна более новая версия или commit
- `1` — ошибка сети или формата

Из git-клона репозитория:

```bash
pnpm distribution:check-updates
```

## Обновление

Если репозиторий уже склонирован:

```bash
node update.mjs
# или из корня клона:
pnpm distribution:update
```

Скрипт выполняет: `git pull` → `pnpm install` → миграции БД → `pnpm build`.

Если клона ещё нет, `update.mjs` выведет команды для первичной установки.

## Проверка версии развёрнутого сервера

После запуска API gateway:

```bash
curl -s http://localhost:4000/version | jq .
```

Ответ содержит `version`, `commit`, `repositoryUrl` и ссылку на удалённый манифест.

## Профили развёртывания

Один код поддерживает **публичный** и **корпоративный** профили — см. `docs/ops/deployment-profiles.md` в репозитории.

## Содержимое архива

- `README.md` — этот файл
- `QUICKSTART.md` — краткая инструкция по запуску
- `manifest.json` — версии компонентов и метаданные репозитория
- `check-updates.mjs` — автоматическая проверка обновлений
- `update.mjs` — обновление из git-клона
