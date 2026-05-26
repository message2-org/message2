# Multi-agent coordination (Cursor / cloud agents)

How to avoid two agents editing the **same task or files** at the same time. This is **advisory** — git merge conflicts remain the hard backstop.

**Do not put agent locks in** [requirements.md](../product/requirements.md) (product scope for humans). Use this file + [ai-context.md](../ai-context.md) §4.

## Status vocabulary

| Status | Meaning |
|--------|---------|
| `open` | Available; no active agent |
| `in_progress` | One agent claimed it; others must not start the same scope |
| `done` | Merged or accepted in working tree; checkbox `[x]` in ai-context |
| `needs_rework` | Landed but broken/incomplete; new agent may claim after reading notes |
| `cancelled` | Dropped or superseded; do not resume unless user asks |

## Who sets `task_id` and `scope`?

| You provide | Agent does |
|-------------|------------|
| Explicit `task_id` + `scope` | Use as-is if free in claims table |
| Only a task in plain language (e.g. «доделать push», «экран логина Android») | **Derive** `task_id` + `scope`, show them in the first reply, then claim |
| Vague / huge task | Propose **one** narrow slice (one service or UI area) and confirm with user if unclear |

You do **not** have to invent ids manually — but the agent **must** still write them to §4 before coding.

### Naming `task_id` (agent-generated)

- Lowercase, hyphenated: `track-b-web-session`, `track-d-android-login`
- Prefix with track when obvious: `track-b-…`, `track-d-…`, `track-c-e2ee-…`, `fix-…`, `chore-…`
- One id = one PR-sized piece of work (hours–days, not «whole Android app»)
- If a similar id exists as `in_progress`, pick a more specific suffix (`track-d-android-login` not `track-d-android`)

### Choosing `scope` (agent-generated)

- List **directories or packages** touched (max ~3 paths), e.g. `apps/web/src/App.tsx`, `services/notifications`
- Narrower is better than `apps/web` unless the task truly spans the whole app

## Claim protocol (start of chat)

1. Read `docs/ai-context.md` §4 **Active work (claims)**.
2. If the task you were asked to do is `in_progress` with a **recent** claim (see stale rule), **stop** and tell the user which task/owner is active; ask to wait or pick another task.
3. If the user did not give `task_id` / `scope`, **propose** them (see above) in your first message, then claim.
4. Before coding, add or update **one row** in the claims table:
   - `task_id` — stable id (e.g. `track-b-push`, `track-d-android-auth`)
   - `status` → `in_progress`
   - `owner` — short label: `cursor:<chat-title-or-id>`, `cloud:<run-id>`, or `human:<name>`
   - `since` — ISO date `YYYY-MM-DD`
   - `scope` — paths/packages (e.g. `services/notifications`, `apps/web/src/App.tsx`)
   - `branch` — `feature/<task_id>` (same string as `task_id` after prefix)
   - `notes` — optional (`PR #N open`, etc.)

5. Create or checkout the branch: `git checkout develop && git pull && git checkout -b feature/<task_id>`.

6. Prefer **one track / one service tree** per agent session (see tracks in ai-context §4).

## Release protocol (end of chat)

1. Set status to `done`, `needs_rework`, or `cancelled`.
2. Update checkboxes and decision log in `docs/ai-context.md` §2–§5 as today ([AGENTS.md](../../AGENTS.md)).
3. Remove or archive stale `in_progress` rows (stale rule below).

## Stale claims

Treat `in_progress` as **expired** if `since` is older than **48 hours** and there is no matching branch activity / user confirmation. Expired rows may be moved to `needs_rework` or `open` with a note: `stale claim cleared YYYY-MM-DD`.

Agents must **not** silently delete another agent’s fresh claim.

## What to lock (granularity)

| Too broad | Good |
|-----------|------|
| `track-b` entire track | `track-b-push-fcm` — `services/notifications` + web subscription UI |
| `apps/web` whole app | `track-b-web-session-restore` — `apps/web` auth/session files only |

Smaller scope → fewer false collisions.

## Combined workflow (recommended)

Use **claims table + git branch** together. They solve different problems; neither alone is enough.

| Step | Claims table | Git |
|------|--------------|-----|
| Start | `in_progress`, `task_id`, `scope` | `git checkout develop && git pull` → `git checkout -b feature/<task_id>` |
| Work | one row per `task_id` | commits only on that branch |
| End | `done` / `needs_rework` + ai-context §2–5 | PR (or local merge) `feature/<task_id>` → `develop` after `git pull origin develop` |

**Branch name = `task_id`:** e.g. claim `track-b-push` → branch `feature/track-b-push`. Two agents must not use the same `task_id`; the table shows if it is taken.

### Do branches “collide”?

- **Different branch names** (`feature/push` vs `feature/android-auth`) do **not** overlap in git — each is an isolated line of commits.
- **Collision happens at merge time** on `develop` when two branches touched the same files. That is normal; resolve in PR merge/rebase, not by avoiding branches.
- **Same branch name** from two clones is bad practice — prevented by unique `task_id` in the claims table + naming rule above.

### PR vs direct merge to `develop`

| Situation | Approach |
|-----------|----------|
| Solo, small doc-only change | Direct commit on `develop` (see [git-branching.md](./git-branching.md)) |
| Any agent task touching code/services | `feature/<task_id>` + PR → `develop` |
| Two agents finished around the same time | Second PR rebases on latest `develop` (`git pull` / “Update branch” in GitHub) |

Agents should **not** commit long-running work directly on `develop` in parallel sessions — integration conflicts become hard to attribute.

### End-of-session git checklist (agent)

```bash
git fetch origin
git checkout feature/<task_id>
git pull origin develop   # or: git rebase origin/develop
pnpm build && pnpm test   # before PR
# open PR feature/<task_id> → develop; then release claim → done
```

If PR is not merged yet, leave claim as `in_progress` with note `PR #N open` or set `needs_rework` if abandoned.

**PR is not done until merged with green CI:** GitHub Actions (or local equivalent) must pass `pnpm build && pnpm test` on the PR branch before merge to `develop`. A failing or skipped CI run blocks merge; fix or re-run until green, then set the claim to `done`.

## Git vs doc locks (summary)

| Mechanism | Role |
|-----------|------|
| **Claims table** | Who owns which **task** right now (human-readable) |
| **Git branch `feature/<task_id>`** | Isolated commits; one branch per task |
| **PR → `develop`** | Tested integration; merge conflicts resolved here |

Run `git pull` on `develop` before creating a branch if others push frequently.

## User prompt snippets

**Minimal (agent picks id + scope):**

```text
Read docs/ai-context.md §4 and docs/ops/agent-coordination.md.
Task: <опишите задачу обычным языком>
Derive task_id + scope, show me, claim if free, branch feature/<task_id>, then implement.
```

**Explicit (you choose id + scope):**

```text
task_id: track-d-android-login
scope: apps/android
Task: <детали>
```

**On finish (either case):** PR → develop, release claim, update ai-context §2–5.

## Related

- [git-branching.md](./git-branching.md) — `develop` / `feature/*`
- [ai-context.md](../ai-context.md) — priorities and handoff
- Agent transcripts in Cursor are **not** authoritative; git + these docs are.
