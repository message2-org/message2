# Coursework / release distribution archive

Lightweight zip for thesis submission or handoff: **pointer to GitHub**, frozen `manifest.json`, and update scripts — not a full source tree.

## Build

```bash
pnpm distribution:build
```

Output: `dist/message2-distribution-v<version>-<shortsha>.zip`

Also refreshes tracked `distribution/manifest.json` (used by remote version checks).

## Check for updates

From repo:

```bash
pnpm distribution:check-updates
```

From extracted archive:

```bash
node check-updates.mjs
```

Compares local manifest with:

`https://raw.githubusercontent.com/message2-org/message2/develop/distribution/manifest.json`

## Apply updates (git clone required)

```bash
pnpm distribution:update
```

Runs `git pull` on `develop`, `pnpm install`, `pnpm db:migrate:deploy`, `pnpm build`.

## Runtime version API

`GET http://localhost:4000/version` (api-gateway) — set `MESSAGE2_VERSION` / `MESSAGE2_COMMIT` in production images.

## Corporate deployments

Use an internal git mirror; point `MESSAGE2_REPOSITORY_URL` and publish `distribution/manifest.json` on the mirror. Clients check your mirror URL instead of public GitHub.
