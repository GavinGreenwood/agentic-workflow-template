---
name: assign-epic
description: Use this skill when a new Jira ticket has just been created (a ticket key was returned from a Jira API POST to /rest/api/3/issue). Automatically assigns the ticket to the most relevant open epic, or asks the user to choose when ambiguous. Also invoked when the user says "assign epic", "link to epic", or "which epic does this belong to".
---

# Assign a Jira ticket to the right epic

Given a ticket ID, fetch all open epics, reason about the best match, and assign the epic — or ask the user to choose when it's ambiguous.

**Ticket:** $ARGUMENTS (if invoked directly — otherwise use the ticket key from the just-created ticket)

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` (or the ticket key from the just-created ticket) is a bare number (e.g. `42`), prepend `$JIRA_PROJECT_KEY-` to get e.g. `PROJ-42`. Set this as `TICKET_KEY` and use it for all steps below.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_PROJECT_KEY` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the target ticket

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY?expand=renderedFields"
```

Extract:

- `fields.summary`
- `fields.description` (rendered text — this is the primary signal for matching)
- `fields.issuetype.name`
- `fields.labels`
- `fields.parent` (key + summary, if present)
- `fields.customfield_10014` (classic epic link, if present)

**If the ticket already has an epic assigned** (non-null `fields.parent` _and_ `fields.parent.fields.issuetype.name == "Epic"`, or `fields.customfield_10014` is set):

- Report: "$TICKET_KEY is already linked to epic [KEY]: [summary]. Do you want to reassign it?"
- Wait for confirmation before continuing. If the user says no, stop here.

## Step 3 — Fetch all open epics

```bash
source .env && curl -s \
  -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/search/jql" \
  -H "Content-Type: application/json" \
  -d "{\"jql\": \"project = $JIRA_PROJECT_KEY AND issuetype = Epic AND statusCategory != Done ORDER BY created DESC\", \"fields\": [\"summary\", \"description\", \"status\", \"labels\"], \"maxResults\": 200}"
```

Build a list of candidates:

```
[KEY] <summary> (<status>)
```

If no open epics are found, tell the user and stop — there is nothing to assign.

## Step 4 — Reason about the best match

Using the ticket's summary, description, type, and labels alongside each epic's summary, reason about which epic this ticket most naturally belongs to.

**Confidence rules:**

- **High confidence** — one epic is a clear fit and the others are clearly not. Proceed to Step 5 without asking.
- **Ambiguous** — two or more epics are plausible, or the ticket could belong to none of them. Present the shortlist and ask the user to choose (see Step 4a).
- **No match** — the ticket is clearly standalone (e.g. a chore, infra task, or bug with no thematic home). Confirm with the user that leaving it unassigned is intentional (see Step 4b).

**Signals that suggest no epic is needed:**

- `issuetype` is Bug, Chore, or Spike with no clear feature area.
- Summary contains words like "dependency update", "upgrade", "housekeeping", "docs", "config".

### Step 4a — Ambiguous: ask the user to choose

Present a numbered list of the plausible epics:

```
I found a few possible epics for $TICKET_KEY ("<summary>"):

1. PROJ-YY — <epic summary>
2. PROJ-ZZ — <epic summary>
3. None of the above

Which epic should I assign? (1/2/3 or the key directly)
```

Wait for the user's answer before continuing.

### Step 4b — No match: confirm unassigned is intentional

```
$TICKET_KEY ("<summary>") doesn't clearly belong to any open epic.
Shall I leave it unassigned, or would you like to pick one from the full list?
```

If the user says leave it unassigned, stop here and report that no change was made.
If the user asks to see the full list, print all open epics (from Step 3) and let them pick.

## Step 5 — Assign the epic

Try the `parent` field first (works for next-gen / team-managed projects):

```bash
source .env && curl -s -o /tmp/jira-resp.json -w "%{http_code}" \
  -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"fields\": {\"parent\": {\"key\": \"<EPIC_KEY>\"}}}"
```

If the response is `2xx` (200 or 204), assignment succeeded — go to Step 6.

If the response is `400` or `404`, fall back to `customfield_10014` (classic project epic link):

```bash
source .env && curl -s -o /tmp/jira-resp.json -w "%{http_code}" \
  -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"fields\": {\"customfield_10014\": \"<EPIC_KEY>\"}}"
```

If both fail, report the contents of `/tmp/jira-resp.json` (Jira's error JSON) and stop. Do not retry silently.

## Step 6 — Report back

Tell the user:

- Ticket: `$JIRA_BASE_URL/browse/$TICKET_KEY`
- Epic assigned: `$JIRA_BASE_URL/browse/<EPIC_KEY>` — `<epic summary>`
- How the match was made (high-confidence auto-match or user selection)
