---
allowed-tools: Bash(git:*), Bash(lsof:*), Bash(curl:*), Bash(docker:*), Bash(npm install:*), Bash(npm run:*), Bash(openssl rand:*), Bash(cp:*), Bash(grep:*), Bash(ls:*), Bash(find:*), Bash(sed:*), Bash(node:*), Bash(jq:*), Bash(dirname:*), Bash(basename:*), Bash(pwd:*), Bash(test:*), Bash(printf:*), Bash(source:*), Bash(ps:*)
description: Manage parallel development slots — multiple independent clones of this repo, each on its own ports, so several agents can work different issues simultaneously. Modes — setup: one-time clone setup; status: slot health + Jira ticket status; free: reset a slot to main when its ticket is in QA/Done; sync: propagate .env changes across slots without overwriting port config.
---

## Context

- Current directory: !`pwd`
- Parent (slot root): !`dirname "$(pwd)"`
- Slot 3400 — exists/branch: !`d="$(dirname "$(pwd)")/$(basename "$(pwd)")-3400"; if [ -d "$d" ]; then b=$(git -C "$d" branch --show-current 2>/dev/null); [ -n "$b" ] && echo "$b" || echo "(detached)"; else echo "(slot not found)"; fi`
- Slot 3410 — exists/branch: !`d="$(dirname "$(pwd)")/$(basename "$(pwd)")-3410"; if [ -d "$d" ]; then b=$(git -C "$d" branch --show-current 2>/dev/null); [ -n "$b" ] && echo "$b" || echo "(detached)"; else echo "(slot not found)"; fi`
- Slot 3420 — exists/branch: !`d="$(dirname "$(pwd)")/$(basename "$(pwd)")-3420"; if [ -d "$d" ]; then b=$(git -C "$d" branch --show-current 2>/dev/null); [ -n "$b" ] && echo "$b" || echo "(detached)"; else echo "(slot not found)"; fi`
- Port status (web/api/db/redis for all slots): !`for p in 3400 3401 3410 3411 3420 3421 15432 15433 15434 16379 16380 16381; do pid=$(lsof -ti :"$p" 2>/dev/null | head -1); if [ -n "$pid" ]; then cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "?"); printf ":%s IN USE pid=%s (%s)\n" "$p" "$pid" "$cmd"; else printf ":%s free\n" "$p"; fi; done`
- Jira credentials present: !`if [ -f .env ]; then ( grep -q "^JIRA_BASE_URL=https" .env && grep -q "^JIRA_EMAIL=." .env && grep -q "^JIRA_API_TOKEN=." .env ) && echo "yes" || echo "no — one or more of JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN missing in .env"; else echo "no — no .env found in current directory"; fi`
- Docker running: !`docker info >/dev/null 2>&1 && echo "yes" || echo "no — Docker not available"`

## Helpers

The following helpers ensure cross-platform compatibility (macOS/BSD vs GNU sed):

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

Read the mode from the user's message — `setup`, `status`, `sync`, or `free` — and follow **only**
that section below. If no mode was given or the mode is unknown, list the four modes with a
one-line description each and stop.

---

### MODE: setup

**One-time setup.** Clones this repo into three independent slot directories. Run from
the base repo directory (the setup vehicle — no port suffix). Do not run from inside a slot.

If slots were previously created as git worktrees (not clones), remove them first, then re-run:

```bash
git worktree remove --force "../$(basename "$(pwd)")-3400"
git worktree remove --force "../$(basename "$(pwd)")-3410"
git worktree remove --force "../$(basename "$(pwd)")-3420"
```

Back up any credential changes from the old slots first and restore them via `/multi-repo sync`.

#### Step 1 — Validate location

Check the current directory name from Context. If it ends in `-3400`, `-3410`, or `-3420`, stop:

> "Run `/multi-repo setup` from the base repo directory (no port suffix), not from inside a slot."

Check that all three `.env` files exist (root `.env`, `apps/web/.env`, `apps/api/.env`). If any
are missing, stop and ask the user to copy from the `.env.example` files first.

#### Step 2 — Create each slot

Work through the three slots in order: **3400**, **3410**, **3420**.

The fixed port assignments are:

| Slot    | Web port | API port | DB host port | Redis host port |
| ------- | -------- | -------- | ------------ | --------------- |
| `-3400` | 3400     | 3401     | 15432        | 16379           |
| `-3410` | 3410     | 3411     | 15433        | 16380           |
| `-3420` | 3420     | 3421     | 15434        | 16381           |

For each slot:

**a. Skip if already exists.**  
Check whether `../$(basename "$(pwd)")-<port>` exists as a directory: `test -d "../$(basename "$(pwd)")-<port>"`.
If it does, report: "Slot `<repo>-<port>` already exists — skipping." and continue.

**b. Check all four ports are free.**  
Read the port status from Context. If any of the four ports (web, API, DB, Redis) for this slot
show `IN USE`, stop with:

> "Cannot create slot `<repo>-<port>` — port `:<conflicting-port>` is held by `<process>`.
> Resolve the conflict before running setup again."

**c. Clone the repo and point it at GitHub.**

Each slot is a fully independent git clone with its own `.git/` directory — all three can be on
`main` simultaneously. After cloning, fix the remote so the slot pushes/pulls directly to GitHub
rather than through the local setup-vehicle directory:

```bash
REMOTE_URL=$(git remote get-url origin)
REPO=$(basename "$(pwd)")
git clone --local -b main . "../${REPO}-<web-port>"
git -C "../${REPO}-<web-port>" remote set-url origin "$REMOTE_URL"
```

**d. Copy and patch `.env` files.**

For each file, copy from the backing store then patch the port-specific values:

**Root `.env`:**

```bash
REPO=$(basename "$(pwd)")
cp .env "../${REPO}-<web-port>/.env"
sed_i "s/^COMPOSE_DB_PORT=.*/COMPOSE_DB_PORT=<db-port>/" "../${REPO}-<web-port>/.env"
sed_i "s/^COMPOSE_REDIS_PORT=.*/COMPOSE_REDIS_PORT=<redis-port>/" "../${REPO}-<web-port>/.env"
```

If `COMPOSE_DB_PORT` or `COMPOSE_REDIS_PORT` are not present in root `.env` (they may be commented
or absent), append them:

```bash
REPO=$(basename "$(pwd)")
echo "COMPOSE_DB_PORT=<db-port>" >> "../${REPO}-<web-port>/.env"
echo "COMPOSE_REDIS_PORT=<redis-port>" >> "../${REPO}-<web-port>/.env"
```

**`apps/web/.env`:**

```bash
REPO=$(basename "$(pwd)")
cp apps/web/.env "../${REPO}-<web-port>/apps/web/.env"
sed_i "s/^PORT=.*/PORT=<web-port>/" "../${REPO}-<web-port>/apps/web/.env"
sed_i "s|^AUTH_URL=.*|AUTH_URL=http://localhost:<web-port>|" "../${REPO}-<web-port>/apps/web/.env"
sed_i "s|^API_URL=.*|API_URL=http://localhost:<api-port>|" "../${REPO}-<web-port>/apps/web/.env"
# Generate a fresh AUTH_SECRET unique to this slot
SECRET=$(openssl rand -hex 32)
sed_i "s/^AUTH_SECRET=.*/AUTH_SECRET=$SECRET/" "../${REPO}-<web-port>/apps/web/.env"
```

**`apps/api/.env`:**

```bash
REPO=$(basename "$(pwd)")
cp apps/api/.env "../${REPO}-<web-port>/apps/api/.env"
sed_i "s/^PORT=.*/PORT=<api-port>/" "../${REPO}-<web-port>/apps/api/.env"
sed_i "s/^DATABASE_PORT=.*/DATABASE_PORT=<db-port>/" "../${REPO}-<web-port>/apps/api/.env"
sed_i "s/^REDIS_PORT=.*/REDIS_PORT=<redis-port>/" "../${REPO}-<web-port>/apps/api/.env"
```

**e. `.vscode/settings.json` — if present.**

The file has a `local` block with `apiBase` and `webBase`. Patch both to the slot's ports:

```bash
REPO=$(basename "$(pwd)")
node -e "
  const fs = require('fs');
  const f = \`../${REPO}-<web-port>/.vscode/settings.json\`;
  try {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    const local = s['rest-client.environmentVariables'].local;
    local.apiBase = 'http://localhost:<api-port>';
    local.webBase = 'http://localhost:<web-port>';
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
    console.log('patched');
  } catch (e) { console.log('skipped: ' + e.message); }
"
```

Note: `requests/*.http` files use `{{apiBase}}` / `{{webBase}}` references from this settings file
— they do NOT contain hardcoded ports and do not need patching.

**f. Install dependencies.**

```bash
REPO=$(basename "$(pwd)")
(cd "../${REPO}-<web-port>" && npm install)
```

Report progress as each command completes.

#### Step 3 — Summary

After processing all slots, print:

```
Slots ready:

  Slot              Web   API   DB     Redis  Status
  <repo>-3400       3400  3401  15432  16379  created ✓
  <repo>-3410       3410  3411  15433  16380  created ✓
  <repo>-3420       3420  3421  15434  16381  created ✓

Next steps for each slot:
  1. Open the slot directory in your editor.
  2. docker compose up -d && npm run dev
  3. /pickup <TICKET-ID>  (to pick up a Jira ticket and create the feature branch)
```

---

### MODE: status

Shows the state of all three slots: current ticket, Jira status, and whether the stack is running.

#### Step 1 — Read slot state from Context

For each slot, use the branch value from Context:

- `(slot not found)` → slot does not exist yet (run `/multi-repo setup`)
- `main` → slot is free
- anything else → slot is occupied; extract the ticket ID

Because slots are independent clones (not worktrees), all three can be on `main` simultaneously —
there is no detached HEAD state to handle.

**Ticket ID extraction:** match the branch name against `([A-Z]+-\d+)-` (case-insensitive) → produce
the ticket key directly (e.g. `ABC-123`). If no match, ticket ID = `—`.

#### Step 2 — Fetch Jira status for each occupied slot

For each slot with a ticket ID, call:

```bash
source .env 2>/dev/null

# Validate Jira credentials before attempting the call
if [ -z "$JIRA_BASE_URL" ] || [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
  echo "— (no Jira credentials configured — source .env first)"
  continue
fi

curl -sf -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<TICKET-KEY>?fields=status,assignee" \
  | jq -r '.fields.status.name // "—"'
```

If the call fails or returns no status, use `—`.

#### Step 3 — Check port liveness and Docker

**Port liveness:** From Context port status, a port marked `IN USE` means a process is listening
(the server is running). For status display: `IN USE` = ✓, `free` = ✗.

Check web port for the "Web" column and API port for the "API" column.

**Docker:** Check if containers for each slot's compose project are running:

```bash
REPO=$(basename "$(pwd)")
docker ps --filter "name=${REPO}-<port>" --format "{{.Status}}" 2>/dev/null | grep -q "Up" && echo "up" || echo "down"
```

#### Step 4 — Print the status table

```
Slot           Ports     Branch           Ticket   Jira status   Web  API  Docker
<repo>-3400    3400/3401 abc-302-foo      ABC-302  In Progress   ✓    ✓    up
<repo>-3410    3410/3411 abc-345-bar      ABC-345  In QA         ✗    ✗    down
<repo>-3420    3420/3421 main             —        —             ✗    ✗    down
```

#### Step 5 — Flag slots eligible for freeing

After the table, for any slot where Jira status is `In QA`, `In Review`, `Done`, or `Closed`
(case-insensitive):

> ⚠ `<repo>-3410`: ABC-345 is **In QA** — run `/multi-repo free` to release this slot.

---

### MODE: free

Resets occupied slots back to `main` once their Jira ticket has reached QA or later.

#### Step 1 — Gather slot state

Read the branch names from Context. For each occupied slot (branch ≠ `main` and branch ≠ `(slot not found)`):

- Extract ticket ID (same pattern as `status` mode)
- Fetch Jira status (same curl as `status` mode)

#### Step 2 — Report ineligible slots

For each slot that is:

- Already on `main`: "Slot `<repo>-<port>` is already free — no action needed."
- On a feature branch with a Jira status of `In Progress`, `To Do`, `Backlog`, or unresolvable:
  "Slot `<repo>-<port>` is on `<branch>` (TICKET-N · In Progress) — not yet eligible."

#### Step 3 — Offer to free each eligible slot

A slot is **eligible** if its Jira status is one of: `In QA`, `In Review`, `Done`, `Closed`
(case-insensitive).

For each eligible slot, show:

> **`<repo>-3410`** — `abc-345-bar` · ABC-345 · **In QA**
>
> Reset this slot to `main`? This will check out `main` and pull latest.
> The dev server must be stopped first — the slot's ports must be free.
>
> Reset to main? [y/N]

Wait for user reply before acting.

**If N:** "Skipped `<repo>-3410`." Continue to next eligible slot.

**If Y:**

a. **Verify all four ports are free.** Check the web, API, DB, and Redis ports for this slot
from Context. Docker containers hold the DB and Redis ports even after the dev server is stopped,
so all four must be free before the slot can be released.

If any port is `IN USE`:

> "Port `:<port>` is still in use in `<repo>-<slot>`. Stop `npm run dev` and run
> `docker compose down` in that slot first, then re-run `/multi-repo free`."

Also check that no Docker containers for the slot are running:

```bash
REPO=$(basename "$(pwd)")
docker ps --filter "name=${REPO}-<port>" --format "{{.Names}}" 2>/dev/null
```

If containers are listed, warn: "Docker containers for `<repo>-<port>` are still running —
run `docker compose down` first." and skip this slot.

b. **Switch to main and pull:**

Each slot is an independent clone, so `git checkout main` always works — there is no branch
conflict between slots:

```bash
REPO=$(basename "$(pwd)")
git -C "../${REPO}-<port>" checkout main
git -C "../${REPO}-<port>" pull origin main
```

c. **Offer to delete the feature branch** if it is pushed and merged:

```bash
REPO=$(basename "$(pwd)")
git -C "../${REPO}-<port>" branch -r --merged origin/main 2>/dev/null | grep -q "<branch>"
```

If merged into `origin/main`:

> "Branch `<branch>` is merged into `origin/main`. Delete local copy? [y/N]"

If confirmed: `git -C "../${REPO}-<port>" branch -d <branch>`

If NOT merged (unpushed or open PR): "Branch `<branch>` is not merged — leaving it in place."

d. **Report:** "Slot `<repo>-3410` freed — now on `main`. Run `/sync` inside this slot to
check for any `.env.example` keys added while the branch was active and to install any new
dependencies." (Note: `/sync` and `/multi-repo sync` solve different problems — `/sync`
checks one slot's `.env` against its `.env.example` template; `/multi-repo sync` propagates
credentials across slots. After a `free`, you want `/sync`.)

#### Step 4 — Summary

After processing all slots, print a one-line summary per slot (freed / skipped / already free).

---

### MODE: sync

Propagates shared secrets and config from the current slot to all others.
**Never writes without explicit user confirmation.** Always shows the full diff first.

#### Step 1 — Determine source

The source is the current working directory from Context. If it does not end in `-3400`, `-3410`,
or `-3420` (i.e. it is the base repo, no port suffix), ask the user:

> "Which slot should be the sync source? (3400 / 3410 / 3420)"

Wait for input, then use `<parent>/<repo>-<chosen>` as the source path.

#### Step 2 — Identify targets

All slot directories that exist AND are not the source. A slot exists if
`test -d "<parent>/$(basename "$(pwd)")-<port>"` (or equivalently if its Context branch value ≠ `(slot not found)`).

#### Step 3 — Port-isolated variables — NEVER sync these

These variables are permanently bound to each slot and must be **excluded** from every sync
operation. Any variable in this list that appears in a diff must be silently skipped:

**root `.env`:** `COMPOSE_DB_PORT`, `COMPOSE_REDIS_PORT`

**`apps/web/.env`:** `PORT`, `AUTH_URL`, `API_URL`, `AUTH_SECRET`

**`apps/api/.env`:** `PORT`, `DATABASE_PORT`, `REDIS_PORT`

#### Step 4 — Build the diff for each target

For each target slot, compare all three `.env` files without printing raw values to the
transcript. Use a key-extraction approach that reveals only which variables differ, not their
values — this keeps secrets out of conversation history:

```bash
# For each .env file pair (root .env, apps/web/.env, apps/api/.env):
# Extract keys that differ between source and target (values are compared internally, not echoed)
while IFS='=' read -r key _; do
  [ -z "$key" ] || [[ "$key" == \#* ]] && continue
  src_val=$(grep "^${key}=" <source>/<file> 2>/dev/null | cut -d'=' -f2-)
  tgt_val=$(grep "^${key}=" <target>/<file> 2>/dev/null | cut -d'=' -f2-)
  [ "$src_val" != "$tgt_val" ] && echo "$key"
done < <(grep -v '^#' <source>/<file> | grep '=')
# Also check for keys present in source but absent from target:
comm -23 \
  <(grep -v '^#' <source>/<file> | grep '=' | cut -d'=' -f1 | sort) \
  <(grep -v '^#' <target>/<file> | grep '=' | cut -d'=' -f1 | sort)
```

For each differing key that is NOT in the port-isolation list above → include it in the diff
table. Do NOT echo or print the actual values during comparison — only the key names are
extracted; values are accessed internally to categorise and build the masked table.

Also include variables that exist in the source but are absent from the target (newly added vars).

**Variable categorisation** for the table's "Category" column (check in order — first match wins):

1. Prefix `JIRA_`, `CIRCLECI_`, `FIGMA_`, `HARNESS_` → **dev-tooling** (mask value)
2. Contains `TOKEN`, `SECRET`, `PASSWORD`, `_KEY` → **secret** (mask value as `[changed]`)
3. All others (URLs, model names, flags, rate limits) → **config** (show actual value)

Prefix rules take precedence — e.g. `JIRA_API_TOKEN` is `dev-tooling` (not `secret`) because
the `JIRA_` prefix match is checked first.

**Do not print raw values for `secret` or `dev-tooling` variables** — the user can see them in
their files; printing them here risks exposing them in conversation history.

If no differences: "No changes to sync to `<repo>-<port>` — already in sync."

If differences found, present:

```
Changes to propagate: <repo>-3400 → <repo>-3410

File             Variable                 Category    Source        Target
apps/api/.env    OPENAI_MODEL             config      gpt-4o        gpt-4o-mini
apps/api/.env    OPENAI_API_KEY           secret      [changed]     [differs]
apps/web/.env    AUTH_SECRET              secret      [changed]     [differs]
.env             JIRA_API_TOKEN           dev-tooling [changed]     [differs]
```

#### Step 5 — Confirm and apply

**STOP. Ask:** "Apply these N changes to `<repo>-<port>`? [y/N]"

One confirmation per target. Do not proceed to the next target before confirming the current one.

**If Y:** For each variable in the diff, write the source value to the target file:

```bash
sed_i "s|^VARIABLE=.*|VARIABLE=<value>|" <target>/<file>
```

If a variable is absent from the target file, append it.

After writing, log:

> "Applied N changes. Port-isolated variables skipped (correct per slot): PORT, AUTH_URL,
> API_URL, DATABASE_PORT, REDIS_PORT, COMPOSE_DB_PORT, COMPOSE_REDIS_PORT, AUTH_SECRET."

**If N:** "Skipped `<repo>-<port>`." Continue to next target.
