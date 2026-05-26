# Git branching model

Lightweight [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/) for Message2: coursework-friendly, works for solo work and small teams, supports public and corporate release cadences.

## Branches

| Branch | Purpose | Merges from | Merges to |
|--------|---------|-------------|-----------|
| `main` | **Rare** production snapshots; tagged releases (`v0.1.0`, …) only after large milestones | `release/*`, `hotfix/*` | — |
| `develop` | **Default branch** (GitHub); all day-to-day integration and CI | `feature/*`, `fix/*`, `chore/*` | `main` only via explicit `release/*` |
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
3. Open PR (or merge locally): `feature/*` → `develop`; CI must be green (`pnpm build && pnpm test`) before merge.
4. **Do not merge `develop` → `main` routinely.** Merge to `main` only for **large, release-shaped milestones** (e.g. first packaged web build, Android store track, desktop installer) via `release/v0.x.y` → `main` + tag → merge back to `develop`.
5. Hotfix from `main` only when a tagged production line is broken; always merge hotfix into `develop` too.

## Solo / small team shortcuts

- Small, safe changes (docs, typos): commit directly on `develop`.
- Anything touching auth, crypto, media, or multi-service behavior: use a short-lived `feature/*` branch.
- **Default remote branch is `develop`** (GitHub). Clone, PRs, and agents target `develop`.
- Do **not** open PRs to `main` for normal feature work. Do **not** merge `develop` into `main` “to sync” without a release decision.
- Keep `main` for tagged release lines only; all feature integration stays on `develop`.

## Multiple Cursor / cloud agents

Use **claims + branches** together ([agent-coordination.md](./agent-coordination.md)):

1. Pick a unique `task_id` (e.g. `track-b-push`); register `in_progress` in `docs/ai-context.md` §4.
2. `git checkout develop && git pull && git checkout -b feature/<task_id>` — branch name matches `task_id`.
3. Commit on that branch only; do not share one branch between two agent chats.
4. Before PR: `git pull origin develop` (merge or rebase), run `pnpm build && pnpm test` locally.
5. PR `feature/<task_id>` → `develop` only after **green CI** on the PR; after merge, set claim `done`.

Parallel agents on **different** `task_id` branches are safe; conflicts appear only when merging to `develop` if the same files changed.

## Protected branch recommendations (GitHub)

- `develop` (default): require CI on PR; optional require PR for org repos.
- `main`: require PR, require CI, no force-push; restrict who can merge (release maintainer).

## Repository default branch

**GitHub default branch: `develop`.** New clones and PRs should use `develop` as the base. `main` stays behind until a deliberate release merge.

## First-time setup (already done in repo)

```bash
git clone <repo>
git checkout develop   # default branch
git pull origin develop
# feature branches from develop; merge to main only via release/*
```

## Related

- CI runs on pushes and PRs to `main` and `develop` (see `.github/workflows/ci.yml`).
- Agent onboarding: [AGENTS.md](../../AGENTS.md).
- Multi-agent claims + branches: [agent-coordination.md](./agent-coordination.md); Cursor rule: `.cursor/rules/agent-coordination.mdc`.
