---
description: Manage parallel development slots — multiple independent clones of this repo, each on its own ports, so several agents can work different issues simultaneously. Modes — setup: one-time clone setup; status: slot health + issue status; free: reset a slot to main when its issue is done; sync: propagate .env changes across slots without overwriting port config.
---

## The idea

One agent per checkout. Three checkouts (`<repo>-a`, `<repo>-b`, `<repo>-c`), each a fully independent git clone with its own ports for web/API/DB/Redis, means three issues can be in flight at once — each in its own editor window, each with its own Claude Code session, none stepping on the others.

Define your slot table once at the top of this file and keep it accurate — every mode below reads from it:

| Slot       | Web port | API port | DB host port | Redis host port |
| ---------- | -------- | -------- | ------------ | --------------- |
| `<repo>-a` | 3000     | 3001     | 15432        | 16379           |
| `<repo>-b` | 3010     | 3011     | 15433        | 16380           |
| `<repo>-c` | 3020     | 3021     | 15434        | 16381           |

## Helpers

```bash
# Portable sed -i (works on macOS and Linux)
sed_i() {
  if sed --version 2>/dev/null | grep -q 'GNU'; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}
```

## Your Task

Read the mode from the user's message — `setup`, `status`, `sync`, or `free` — and follow **only** that section. If no mode was given or the mode is unknown, list the four modes with a one-line description each and stop.

---

### MODE: setup

**One-time setup.** Clones this repo into the slot directories. Run from the base checkout (the setup vehicle — no slot suffix), not from inside a slot.

For each slot, in order:

**a. Skip if already exists.** `test -d ../<slot>` — if it exists, report and continue.

**b. Check all four ports are free.** Use `lsof -ti :<port>` (or `netstat` on Windows). If any port is held, stop with the conflicting port and process.

**c. Clone the repo and point it at the real remote.** Each slot is a fully independent clone — all slots can be on `main` simultaneously:

```bash
REMOTE_URL=$(git remote get-url origin)
git clone --local -b main . ../<slot>
git -C ../<slot> remote set-url origin "$REMOTE_URL"
```

**d. Copy and patch `.env` files.** Copy each `.env` from the base checkout into the slot, then patch the port-specific values (web `PORT`, API `PORT`, `DATABASE_PORT`, `REDIS_PORT`, any localhost URLs containing ports, and regenerate any per-instance secret like an auth session secret with `openssl rand -hex 32`).

**e. Install dependencies and run codegen:**

```bash
(cd ../<slot> && npm install && npm run prisma:generate --if-present)
```

Finish with a summary table of all slots, their ports, and status, plus next steps: open the slot in an editor, start docker + dev servers, `/pickup <issue>`.

---

### MODE: status

Shows the state of all slots: current branch, issue, and whether the stack is running.

1. For each slot: `git -C ../<slot> branch --show-current`
   - directory missing → "(slot not found — run setup)"
   - `main` → slot is free
   - anything else → occupied; extract the issue number from the branch name (`<number>-...`)
2. For each occupied slot, fetch the issue state: `gh issue view <number> --json state,title,assignees`
3. Check port liveness for the slot's web/API ports and whether its docker containers are up.
4. Print the status table:

```
Slot        Ports      Branch          Issue  State        Web  API  Docker
<repo>-a    3000/3001  302-foo         #302   open         ✓    ✓    up
<repo>-b    3010/3011  345-bar         #345   closed       ✗    ✗    down
<repo>-c    3020/3021  main            —      —            ✗    ✗    down
```

5. For any slot whose issue is closed (or whose PR is merged), flag it:

> ⚠ `<repo>-b`: #345 is **closed** — run `/multi-repo free` to release this slot.

---

### MODE: free

Resets occupied slots back to `main` once their issue is closed or its PR is merged/in review.

For each occupied slot:

1. Determine eligibility: the issue is closed, or its PR is merged or awaiting QA. If still actively in progress, report "not yet eligible" and skip.
2. For each eligible slot, ask: "Reset `<slot>` (`<branch>` · #<issue>) to `main`? The dev server and docker containers must be stopped first." Wait for confirmation.
3. On yes:
   - Verify all four of the slot's ports are free and no docker containers for the slot are running. If not, tell the user what to stop and skip.
   - `git -C ../<slot> checkout main && git -C ../<slot> pull origin main`
   - If the feature branch is merged into `origin/main`, offer to delete the local copy (`git branch -d`). If not merged, leave it in place.
   - Suggest running `/sync` inside the slot to pick up any new env vars or dependencies added while the branch was active.

Finish with a one-line summary per slot (freed / skipped / already free).

---

### MODE: sync

Propagates shared secrets and config from the current slot to all others.
**Never writes without explicit user confirmation.** Always shows the diff first.

1. **Source** = the current working directory. If run from the base checkout, ask which slot to use as source.
2. **Targets** = all other slot directories that exist.
3. **Port-isolated variables — NEVER sync these** (they are permanently bound to each slot): web/API `PORT`, `DATABASE_PORT`, `REDIS_PORT`, any localhost URL containing a slot port, and per-instance secrets (e.g. auth session secret). Silently skip any of these that appear in a diff.
4. **Build the diff for each target** by comparing keys, not values, in the transcript — extract which keys differ or are missing, but never echo secret values into conversation history. Categorise each differing key: contains `TOKEN`/`SECRET`/`PASSWORD`/`_KEY` → **secret** (mask as `[changed]`); otherwise **config** (show actual value).
5. Present the masked diff table per target, then **STOP and ask**: "Apply these N changes to `<slot>`? [y/N]" — one confirmation per target.
6. On yes, write each value with `sed_i` (append if the key is absent), then log what was applied and which port-isolated variables were skipped.
