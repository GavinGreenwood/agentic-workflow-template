Pick up a Jira ticket: assign it to me, move it to In Progress, read it fully with all subtasks and linked context, then prepare to implement.

**Ticket:** $ARGUMENTS

Usage: `/pickup <ticket-id> [--stay] [--qa]`

- `--stay` — do **not** create a new branch. Stay on the current branch and do the work there. Use this when stacking multiple tickets on one branch.
- `--qa` — **QA-rework mode.** Work is already done and merged to `main`; the ticket is back from QA with comments. Runs the normal Jira front-door (assign, In Progress, board) — which `/qa-review-action` doesn't — then hands off to `/qa-review-action` for the feedback itself. Branch behaves like a normal pickup (fresh fix branch off `main`); add `--stay` to rework on the current branch with latest `main` merged in first.

---

## Step 0 — Parse arguments and normalise the ticket ID

Split `$ARGUMENTS` into the ticket ID and any flags:

- If `--stay` is present anywhere in `$ARGUMENTS`, enable **stay mode** and remove the flag before normalising. Stay mode changes Steps 10 and 11 only — all Jira steps run unchanged.
- If `--qa` is present anywhere in `$ARGUMENTS`, enable **QA-rework mode** and remove the flag before normalising. QA-rework mode is described in Step 12 — all Jira steps (1–8) and the PROGRESS.md step (11) run unchanged; Step 9 adds one conditional brief line.
- `--stay` and `--qa` can be combined. With both active, you do the QA rework on the current branch (stay mode) and Step 10 merges latest `main` into it first.
- If the remaining ticket ID is a bare number (e.g. `25`), prepend `$JIRA_PROJECT_KEY-` to get e.g. `PROJ-25`.
- Store the cleaned, normalised ticket ID as `TICKET_KEY`. Use `TICKET_KEY` (not `$ARGUMENTS`) for all subsequent steps.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_ACCOUNT_ID` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the ticket

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY?expand=subtasks,renderedFields"
```

Parse the response and extract:

- `fields.summary`
- `fields.description` (full rendered text)
- `fields.assignee` (may be null)
- `fields.status.name`
- `fields.issuetype.name`
- `fields.parent` (if present — epic or story)
- `fields.subtasks` (array of subtask keys)
- `fields.issuelinks` (linked issues)
- `fields.labels`
- `fields.priority.name`
- `fields.customfield_10014` (epic link, if present)

## Step 2a — Check epic assignment

Check the fetched ticket data:

- If `fields.parent` is present and its issuetype is "Epic", the epic is set → continue to Step 3.
- If `fields.customfield_10014` is set (classic epic link field), the epic is set → continue to Step 3.
- If neither is set → note this in the brief (Step 9) as an open question, then continue.

## Step 3 — Assignee safety check

- If `fields.assignee` is **null** (unassigned) → proceed.
- If `fields.assignee.accountId` matches `$JIRA_ACCOUNT_ID` → proceed.
- If `fields.assignee` is **someone else** → STOP. Output: "$TICKET_KEY is assigned to [displayName] — are you sure you want to pick this up?" Do not proceed until the user confirms.

## Step 4 — Assign the ticket to me

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY/assignee" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$JIRA_ACCOUNT_ID\"}"
```

## Step 5 — Move onto the active board

Do this **before** the In Progress transition (Step 6). Adding an issue to the board drops it into the board's default column (e.g. "Ready for Development"), which would overwrite an In Progress status set beforehand. Always add to the board first, then transition last.

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/agile/1.0/board/$JIRA_BOARD_ID/issue" \
  -H "Content-Type: application/json" \
  -d "{\"issues\": [\"$TICKET_KEY\"]}"
```

## Step 6 — Move to In Progress

This must be the **last** Jira write, so nothing (like the board-add above) can clobber the status afterwards.

First, get available transitions (fetch them fresh — available transitions and their ids depend on the ticket's current status, so never reuse an id from an earlier run):

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY/transitions"
```

Find the transition whose `name` matches "In Progress" (case-insensitive). Use its `id` to apply it:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY/transitions" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "<transition-id>"}}'
```

Then confirm the status actually landed on In Progress (a `204` only means the request was accepted, not that the status stuck):

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY?fields=status"
```

## Step 7 — Fetch all subtasks

For each key in `fields.subtasks`, fetch the full issue:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<subtask-key>?expand=renderedFields"
```

Read and summarise each subtask's summary, description, and status.

## Step 8 — Fetch parent/epic context

If the ticket has a `fields.parent`, fetch that ticket too to understand the broader story or epic.

If `fields.customfield_10014` (epic link) is set and different from the parent, fetch that as well.

## Step 9 — Output a brief

Print a structured briefing so the work is clear before any code is written:

```
## Ticket: $TICKET_KEY — <summary>

**Type:** <issuetype>
**Priority:** <priority>
**Status:** → In Progress (just moved)
**Parent:** <parent key + summary, if any>
**Branch (stay mode only):** <current branch — include this line only when `--stay` is active; omit otherwise>
**🔁 QA rework:** <only include this line when `--qa` is active — "Work is already merged to `main`. This is rework from QA comments. After branch setup, control hands off to `/qa-review-action` to classify and action the feedback.">

### Description
<rendered description>

### Subtasks
- [ ] <subtask-key>: <summary> (<status>)
...

### Linked issues
- <link type>: <key> — <summary>
...

### Implementation notes
<what needs to be built, based on reading the ticket and relevant docs>

### Open questions
<anything unclear that needs resolving before coding starts>
```

## Step 10 — Create the feature branch (skipped in stay mode)

**If stay mode (`--stay`) is active:**

- Run `git branch --show-current` to check the current branch.
- If the current branch is `main` (or empty/detached), **STOP** and tell the user: "You are on `main`. The `--stay` flag is for continuing work on an existing feature branch. Rerun without `--stay` to create a new branch, or switch to the feature branch first."
- Otherwise: do **not** switch branches, do **not** checkout main, do **not** create a new branch. All work happens on the current branch.
- **If both `--qa` and `--stay` are active:** bring the merged implementation into the current branch first so the QA fixes land on top of it:
  ```bash
  git fetch origin main && git merge origin/main
  ```
  If the merge reports conflicts, STOP and ask the user to resolve them before continuing. Do not proceed to the hand-off with an unfinished merge.
- Every commit for this ticket must reference the **new** ticket ID in its message (e.g. `$TICKET_KEY: feat: ...`), even though the branch name references a different ticket.
- Skip to Step 11.

**Otherwise**, following CONTRIBUTING.md naming conventions, create and switch to a new branch:

```bash
git checkout main && git pull && git checkout -b <ticket-id-lowercase>-<short-description>
```

Use the ticket ID lowercased and a 2–4 word kebab-case description derived from the summary.

## Step 11 — Initialise PROGRESS.md

Create a `PROGRESS.md` file in the repo root as the session scratchpad (per CLAUDE.md). Seed it with the ticket context so the session log starts with a clear baseline:

```markdown
# PROGRESS.md — <ticket-id>: <summary>

**Branch:** <branch-name>
**Started:** <today's date>

## Plan

<high-level implementation approach derived from the ticket brief>

## Progress

_Nothing logged yet._

## Decisions

_None yet._

## Open Questions

<carry over any open questions from the Step 9 brief>
```

**If stay mode (`--stay`) is NOT active:** create `PROGRESS.md` fresh. If one already exists (leftover from a previous session), read it first, then overwrite it with the new session header — do not append to stale content.

**If stay mode (`--stay`) is active and a `PROGRESS.md` already exists**, it belongs to the branch's ongoing work — do **not** overwrite it. Instead, append a new ticket section to the end:

```markdown
---

# <ticket-id>: <summary> (stacked on this branch)

**Branch:** <current branch>
**Started:** <today's date>

## Plan

<high-level implementation approach derived from the ticket brief>

## Progress

_Nothing logged yet._

## Decisions

_None yet._

## Open Questions

<carry over any open questions from the Step 9 brief>
```

**If stay mode (`--stay`) is active and `PROGRESS.md` does NOT exist**, create it fresh using the standard template above (same as non-stay mode).

## Step 12 — Hand off to QA review (QA-rework mode only)

**Only when `--qa` is active** (otherwise skip). The Jira front-door (assign, In Progress, board) and branch are now set up — the state `/qa-review-action` can't establish on its own.

Tell the user: "Ticket set up for QA rework — assigned, In Progress, on branch `<branch-name>`. Handing off to `/qa-review-action`." Then invoke the `qa-review-action` skill (defined in `.claude/commands/qa-review-action.md`, invoked as `/qa-review-action`) for `$TICKET_KEY` to fetch, classify, and action the feedback. Don't duplicate that work here.

---

After the briefing is output, the branch is created (or confirmed, in stay mode), and PROGRESS.md is initialised (or appended to):

- **In QA-rework mode (`--qa`):** proceed straight to Step 12 — do not pause for go-ahead, since `/qa-review-action` has its own confirmation gates before applying fixes or posting to Jira.
- **Otherwise:** pause and ask: "Ready to start — any questions before I begin?" Wait for the user's go-ahead before writing any code.
