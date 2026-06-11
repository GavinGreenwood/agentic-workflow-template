Review QA feedback on a Jira ticket: classify each point as a genuine bug, intended behaviour, or out of scope — then propose fixes or push-back responses accordingly.

**Ticket:** $ARGUMENTS

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a full Jira URL, extract the ticket key from the URL path. If it is a bare number, prepend `$JIRA_PROJECT_KEY-`. Store the result as `TICKET_ID`.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, and `JIRA_EMAIL` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the ticket

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID?expand=subtasks,renderedFields,attachment"
```

Extract:

- `fields.summary`
- `renderedFields.description` (rendered HTML — this is the acceptance criteria / spec; `fields.description` is ADF JSON and not human-readable)
- `fields.status.name`, `fields.issuetype.name`, `fields.parent`
- `fields.attachment` (array of all attachments — id, filename, mimeType, content URL)

## Step 3 — Fetch all comments

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment?startAt=0&maxResults=100&orderBy=created"
```

Check the `total` field — if it exceeds the comments returned, continue fetching with `startAt=100`, `startAt=200`, etc. until all pages are retrieved.

For each comment, extract `author.displayName`, `created`, and convert the ADF `body` to plain text by extracting all text nodes while preserving whitespace and line breaks. Mark comments ending with `_Actioned by Claude Code_` as **Claude-authored**; discard them — only apply the QA heuristics to human-authored comments.

Filter human-authored comments to those that look like QA feedback: behaviour observed in a deployed environment, screenshots, reproduction steps, or QA language ("bug", "expected", "actual", "reproduce", "regression", "not working", "should be").

If no comments look like QA feedback, tell the user: "No QA feedback comments found on `TICKET_ID`. Nothing to review." and stop.

## Step 4 — Download and analyse screenshots

Screenshots may appear as inline ADF media nodes (extract `attrs.id` — the attachment ID) or as filename references to `fields.attachment` entries. Download each one:

```bash
source .env && curl -s -L -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -o /tmp/qa-screenshot-<id>.<ext> \
  "$JIRA_BASE_URL/rest/api/3/attachment/content/<attachment-id>"
```

Then use the `Read` tool on each downloaded file to view it visually. Note what each screenshot shows: the page/section, the visible defect, any error messages, and relevant UI state.

## Step 5 — Extract and number QA points

From the QA comments and screenshots, extract a flat numbered list of distinct issues raised. If a single comment raises multiple distinct problems, split them into separate numbered points.

## Step 6 — Classify each QA point

**GENUINE BUG** — the behaviour is clearly unintended AND the original acceptance criteria imply this should work correctly, AND no ADR or documented decision justifies the behaviour, AND it is not clearly outside the ticket's scope.

**INTENDED BEHAVIOUR** — an ADR or documented decision explicitly or implicitly describes why the system behaves this way. Quote the specific ADR and section. Do not classify as intended behaviour without a concrete reference.

**OUT OF SCOPE** — valid functionality, but never in the acceptance criteria of this ticket. A new request, not a defect — log as a new ticket, don't fix here.

**UNCERTAIN** — none of the above applies with confidence. Document exactly why — what evidence points each way.

## Step 7 — For GENUINE BUG points: analyse the codebase

For each GENUINE BUG, find the most likely source: use grep/glob to locate relevant files (do not guess paths), identify the specific file(s) and line(s), propose a concrete fix (what to change, where, why), and note test impact. Vague suggestions like "check the component" are not acceptable.

## Step 8 — Present findings and ask for decisions

Output a structured report per QA point: source comment, screenshot description, classification, reasoning (with citations), and proposed action (fix / push-back draft / follow-up ticket / both options for UNCERTAIN).

If UNCERTAIN items exist, ask the user to decide each one (`fix` / `push-back` / `skip`) and wait before proceeding.

## Step 9 — Apply fixes for GENUINE BUG and user-accepted items

1. Read the relevant source file(s) before editing; apply each change; write/update tests following TDD conventions.
2. Run `scripts/verify.sh` and resolve any failures.
3. Commit all changes together: `git commit -m "<TICKET_ID>: address QA feedback"` and push.

## Step 10 — Confirm before posting to Jira

Show the user the exact comment that will be posted and ask for explicit approval (yes / edit / cancel). Only post once confirmed.

Format the approved summary as ADF and post it. Structure: **QA Review Response**, one bullet per point — **Fixed** / **Intended behaviour** (cite the ADR) / **Out of scope** (+ follow-up suggestion) / **Pushed back** / **Skipped**. End with:

_Actioned by Claude Code_

## Step 11 — Transition ticket if all QA points are resolved

If every QA point is resolved (no open defects remain), ask the user whether to move `TICKET_ID` back to the testing status (e.g. "Ready for Testing"). On yes, fetch transitions and apply the matching one.

---

## Notes

- When classifying INTENDED BEHAVIOUR, require an explicit reference. "It probably makes sense" is not sufficient.
- Push-back replies must be respectful and cite the specific ADR, design doc, or acceptance criteria.
- All Jira comments must end with `_Actioned by Claude Code_`.
- Screenshots are evidence, not decoration — use what they show as part of your classification reasoning.
