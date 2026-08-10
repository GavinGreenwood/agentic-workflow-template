Build full context on a Jira ticket before follow-on work: the ticket, its comments, its epic/parent chain, every PR raised against it, and the actual code those PRs shipped.

**Ticket:** $ARGUMENTS

Usage: `/briefing <ticket-id>`

Read-only. Does not assign, transition, comment on, or otherwise modify the ticket or any PR — this is purely for getting the human up to speed.

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a bare number (e.g. `25`), prepend `$JIRA_PROJECT_KEY-` to get e.g. `PROJ-25`. Store the result as `TICKET_KEY`.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL` are set in `.env` in the current repo. If missing, stop and ask the user to add them. Source `.env` before all Jira calls. Confirm `gh auth status` succeeds before any GitHub calls.

## Step 2 — Fetch the ticket and its full comment thread

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY?expand=renderedFields"
```

Extract `fields.summary`, `fields.description`, `fields.status.name`, `fields.issuetype.name`, `fields.parent`, `fields.customfield_10014` (epic link), `fields.subtasks`, `fields.issuelinks`, `fields.labels`.

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_KEY/comment?orderBy=created"
```

Read every comment oldest-first — `author.displayName`, `created`, plain-text body. This is the decision trail: who asked what, who answered, what changed direction mid-ticket. Distinguish an agent's own progress summary from genuine human input — the former restates what was done, the latter is a decision.

## Step 3 — Walk the epic/parent chain

If `fields.parent` is set, fetch it. If that parent also has a parent, keep walking up until you reach the epic (`issuetype.name == "Epic"`) or run out of ancestors. Fetch the epic itself and read its description and comments the same way as Step 2 — the epic is where the ticket's _why_ lives, not just its _what_.

If `fields.customfield_10014` is set and differs from the parent chain, fetch that too.

## Step 4 — Fetch subtasks and linked issues

For each key in `fields.subtasks`, fetch the full issue and its comments. For each entry in `fields.issuelinks`, note the link type (blocks/relates to/etc.) and fetch a summary of the linked issue — enough to know if it changes how the ticket should be read, not a full deep-dive unless it looks load-bearing.

## Step 5 — Find every PR raised against the ticket

Search across all PR states — open, merged, and closed-without-merge all matter for context:

```bash
gh pr list --state all --search "$TICKET_KEY" \
  --json number,title,state,url,body,mergedAt,author,createdAt
```

Also check for PRs whose title/branch don't mention the key but whose commits do (this happens when a branch got renamed or stacked):

```bash
gh api "repos/{owner}/{repo}/pulls?state=all" --paginate \
  --jq ".[] | select(.title | test(\"$TICKET_KEY\"; \"i\")) | {number, title, state}"
```

Pass `state` in the query string, not as `-f state=all` — `gh api` switches to POST as soon as a field
is supplied, which would attempt to open a pull request instead of listing them.

Build the full list of PR numbers touching this ticket before moving on — don't process them one at a time as you find them, since a later search may surface one you'd already started summarising without it.

## Step 6 — Read each PR: description, discussion, and diff

For every PR number found:

```bash
gh pr view <number> --json title,body,state,mergedAt,files,additions,deletions
gh pr diff <number>
gh api repos/{owner}/{repo}/pulls/<number>/comments --paginate
gh api repos/{owner}/{repo}/issues/<number>/comments --paginate
gh api repos/{owner}/{repo}/pulls/<number>/reviews --paginate
```

For each PR, note: what it actually changed (from the diff, not just the title), why (from the description), what reviewers pushed back on or asked to change, and whether feedback was accepted or argued down. A PR that was closed without merging is still context — it tells you an approach was tried and abandoned, and usually why.

If a PR is large, read the diff file-by-file rather than skimming — the goal is to actually understand the shipped code, not just know that code exists.

## Step 7 — Synthesise

Produce a single narrative brief, in this order:

```
## Briefing: <ticket-id> — <summary>

### The ask
What the ticket (and epic, if it adds meaning) actually asks for, in your own words — not a copy of the description.

### Timeline
Chronological walk through: ticket created → key comments/decisions → PR(s) raised → review discussion → merge (or abandonment). Call out any direction changes and why they happened.

### What shipped
Per merged PR: a short summary of the actual code change (files/areas touched, the approach taken), not just "implemented the feature."

### Decisions and constraints established
Anything settled during discussion that isn't obvious from the ticket text alone — naming choices, scope cuts, deliberate deferrals, "we decided not to do X because Y."

### Loose ends
Anything left open: follow-up tickets mentioned, known limitations acknowledged in review, TODOs left in the shipped code, unresolved PR comments.
```

Keep this tight — it exists so the user can start follow-on work without re-reading everything themselves, not to reproduce everything you read.

## Step 8 — Hand back

Do not take any action on the ticket or any PR. End by asking the user what they want to do with this context — the brief is preparation, not a deliverable in itself.
