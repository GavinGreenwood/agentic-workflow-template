Pick up a Jira ticket: assign it to me, move it to In Progress, read it fully with all subtasks and linked context, then prepare to implement.

**Ticket:** $ARGUMENTS

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a bare number (e.g. `25`), prepend `$JIRA_PROJECT_KEY-` to get e.g. `PROJ-25`. Use the normalised ID for all steps below.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_ACCOUNT_ID` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the ticket

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_ID>?expand=subtasks,renderedFields"
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

Then fetch the comment history (`/comment?orderBy=created`) — the latest comments often contain decisions or QA feedback that supersede the description. Read them all.

## Step 3 — Assignee safety check

- If `fields.assignee` is **null** (unassigned) → proceed.
- If `fields.assignee.accountId` matches `$JIRA_ACCOUNT_ID` → proceed.
- If `fields.assignee` is **someone else** → STOP. Output: "<TICKET_ID> is assigned to [displayName] — are you sure you want to pick this up?" Do not proceed until the user confirms.

## Step 4 — Assign the ticket to me

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_ID>/assignee" \
  -H "Content-Type: application/json" \
  -d "{\"accountId\": \"$JIRA_ACCOUNT_ID\"}"
```

## Step 5 — Move to In Progress

First, get available transitions:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_ID>/transitions"
```

Find the transition whose `name` matches "In Progress" (case-insensitive). Use its `id` to apply it:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_ID>/transitions" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "<transition-id>"}}'
```

## Step 6 — Move onto the active board (if `JIRA_BOARD_ID` is set)

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/agile/1.0/board/$JIRA_BOARD_ID/issue" \
  -H "Content-Type: application/json" \
  -d "{\"issues\": [\"<TICKET_ID>\"]}"
```

A newly created ticket otherwise sits invisibly in the backlog.

## Step 7 — Fetch all subtasks

For each key in `fields.subtasks`, fetch the full issue and summarise its summary, description, and status.

## Step 8 — Fetch parent/epic context

If the ticket has a `fields.parent`, fetch that ticket too to understand the broader story or epic.

## Step 9 — Output a brief

Print a structured briefing so the work is clear before any code is written:

```
## Ticket: <TICKET_ID> — <summary>

**Type:** <issuetype>
**Priority:** <priority>
**Status:** → In Progress (just moved)
**Parent:** <parent key + summary, if any>

### Description
<rendered description>

### Subtasks
- [ ] <subtask-key>: <summary> (<status>)

### Linked issues
- <link type>: <key> — <summary>

### Implementation notes
<what needs to be built, based on reading the ticket and relevant docs>

### Open questions
<anything unclear that needs resolving before coding starts>
```

## Step 10 — Create the feature branch

Following CONTRIBUTING.md naming conventions, create and switch to a new branch:

```bash
git checkout main && git pull && git checkout -b <ticket-id-lowercase>-<short-description>
```

Use the ticket ID lowercased and a 2–4 word kebab-case description derived from the summary.

## Step 11 — Initialise PROGRESS.md

Create a `PROGRESS.md` file in the repo root as the session scratchpad (per CLAUDE.md), seeded with the ticket context: branch, date, plan, empty progress/decisions sections, and any open questions from the Step 9 brief.

If a `PROGRESS.md` already exists (leftover from a previous session), read it first, then overwrite it with the new session header — do not append to stale content.

---

After the briefing is output, the branch is created, and PROGRESS.md is initialised, pause and ask: "Ready to start — any questions before I begin?" Wait for the user's go-ahead before writing any code.
