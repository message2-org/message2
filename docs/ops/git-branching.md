# Git branching model

Lightweight [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/) for Message2: coursework-friendly, works for solo work and small teams, supports public and corporate release cadences.

## Branches

| Branch | Purpose | Merges from | Merges to |
|--------|---------|-------------|-----------|
| `main` | Production-ready history; tagged releases (`v0.1.0`, …) | `develop`, `hotfix/*` | — |
| `develop` | Daily integration; CI must pass here | `feature/*`, `fix/*`, `chore/*`, `release/*` | `main` |
| `feature/*` | New capability (e.g. `feature/media-minio`) | — | `develop` |
| `fix/*` | Bugfix on top of current integration | — | `develop` |
| `chore/*` | Tooling, docs, repo hygiene | — | `develop` |
| `release/*` | Release prep (version bumps, changelog) | `develop` | `main` and back to `develop` |
| `hotfix/*` | Urgent fix on production | `main` | `main` and `develop` |

**Naming:** use `develop`, not `dev`, to avoid confusion with `pnpm dev` / dev environment.

## Typical flow

```text
main     o----------------o----------------o  (v0.2.0 tag)
              \              /
develop  o-----o------o------o------o------o
              \    /    \    /
feature/*      o--o      o--o
```

1. Branch from `develop`: `git checkout develop && git pull && git checkout -b feature/my-change`
2. Commit in small logical chunks on the feature branch.
3. Open PR (or merge locally): `feature/*` → `develop`; run `pnpm build && pnpm test`.
4. When releasing: `release/v0.x.y` from `develop` → merge to `main` + tag → merge back to `develop`.
5. Hotfix from `main` only when production is broken; always merge hotfix into `develop` too.

## Solo / small team shortcuts

- Small, safe changes (docs, typos): commit directly on `develop`.
- Anything touching auth, crypto, media, or multi-service behavior: use a short-lived `feature/*` branch.
- Keep `main` deployable; do not develop day-to-day on `main`.

## Protected branch recommendations (GitHub)

- `main`: require PR, require CI, no force-push.
- `develop`: require CI on PR; optional require PR for org repos.

## First-time setup (already done in repo)

```bash
git checkout main
git checkout -b develop
# work on develop or feature branches; merge to main via release
git push -u origin develop
```

Set default branch to `develop` in GitHub only if the team agrees; otherwise keep `main` as default and use PRs into `develop` for daily work.

## Related

- CI runs on pushes and PRs to `main` and `develop` (see `.github/workflows/ci.yml`).
- Agent onboarding: [AGENTS.md](../../AGENTS.md).
