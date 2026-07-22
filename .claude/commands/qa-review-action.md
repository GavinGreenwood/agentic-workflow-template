Review QA feedback on a Jira ticket: classify each point as a genuine bug, intended behaviour, or out of scope — then propose fixes or push-back responses accordingly.

**Ticket:** $ARGUMENTS

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a full Jira URL (e.g. `https://*.atlassian.net/browse/$JIRA_PROJECT_KEY-42`), extract the ticket key from the URL path. If it is a bare number (e.g. `42`), prepend `$JIRA_PROJECT_KEY-`. Store the result as `TICKET_ID` and use it in place of `$ARGUMENTS` for all curl commands below.

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
- `fields.status.name`
- `fields.issuetype.name`
- `fields.parent` (if present — story or epic for broader context)
- `fields.attachment` (array of all attachments — id, filename, mimeType, content URL)

## Step 3 — Fetch all comments

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment?startAt=0&maxResults=100&orderBy=created"
```

Check the `total` field in the response. If `total` exceeds the number of comments returned, continue fetching with `startAt=100`, `startAt=200`, etc. until all pages are retrieved. Concatenate all results into a single comment list.

For each comment, extract `author.displayName`, `created`, and convert the `body` field (which is Atlassian Document Format JSON) to plain text by extracting all text nodes while preserving whitespace and line breaks.

Discard any comment that is a prior QA review response posted by this command — identified by its **QA Review Response** heading and the classification-bullet structure described in Step 10. Only apply the QA feedback heuristics below to the remaining (genuine QA feedback) comments.

Filter human-authored comments to those that look like QA feedback. Signs of QA feedback:

- The author is not a developer (e.g. QA, tester, product, or similar role)
- The comment refers to behaviour observed in a deployed environment, screenshots, or specific reproduction steps
- The comment uses QA language: "bug", "expected", "actual", "screenshot", "reproduce", "regression", "UAT", "testing", "issue found", "not working", "incorrect", "should be"

If no comments look like QA feedback, tell the user: "No QA feedback comments found on `TICKET_ID`. Nothing to review." and stop.

## Step 4 — Download and analyse screenshots

For each QA comment, check whether it references screenshots. Screenshots may appear as:

- Inline attachments embedded in the comment body using ADF media nodes (extract the `attrs.id` — this is the attachment ID)
- References by filename to entries in `fields.attachment`

For every screenshot identified, download it to a temp path:

```bash
source .env && curl -s -L -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -o /tmp/qa-screenshot-<id>.<ext> \
  "$JIRA_BASE_URL/rest/api/3/attachment/content/<attachment-id>"
```

Then use the `Read` tool on each downloaded file to view it visually. Note what the screenshot shows: the page/section, the visible defect or unexpected behaviour, any error messages, and any relevant UI state.

## Step 5 — Extract and number QA points

From the QA comments and screenshots, extract a flat numbered list of distinct issues raised. Each issue should be one clearly scoped observation, e.g.:

1. "The chart legend is missing on the Rankings Overview section"
2. "The export button throws a 500 error when clicked with no data"
3. "The institution name truncates too aggressively on mobile"

If a single comment raises multiple distinct problems, split them into separate numbered points. Do not merge separate observations into one item.

## Step 6 — Classify each QA point

For each numbered QA point, make a classification based on everything read so far:

### Classification rules

**GENUINE BUG** — the behaviour is clearly unintended AND:

- The original ticket acceptance criteria imply this should work correctly, OR
- There is no ADR or documented decision that justifies the behaviour, AND
- It is not clearly outside the stated scope of the ticket

**INTENDED BEHAVIOUR** — an ADR or documented decision explicitly or implicitly describes why the system behaves this way. Quote the specific ADR and section. Do not classify as intended behaviour without a concrete reference.

**OUT OF SCOPE** — the QA point describes valid functionality, but it was never in the acceptance criteria of this ticket (or any linked ticket). This is a new request, not a defect. These should be logged as new tickets, not fixed here.

**UNCERTAIN** — none of the above applies with confidence. Use this only when the evidence is genuinely ambiguous after reading all available context. Document exactly why you are uncertain — what evidence points each way.

## Step 7 — For GENUINE BUG points: analyse the codebase

For each point classified as GENUINE BUG, find the most likely source of the problem in the codebase:

1. Read `apps/web/` for frontend issues, `apps/api/` for backend issues. Use `grep` and `find` to locate relevant files — do not guess file paths.
2. Identify the specific file(s) and line(s) where the defect most likely originates.
3. Propose a concrete fix: what to change, in which file, and why that change addresses the root cause.
4. Note any tests that would need to be added or updated.

Be precise. Vague suggestions like "check the component" are not acceptable — name the file, the function, and the change.

## Step 8 — Present findings and ask for decisions

Output a structured report. For each QA point:

---

### [N] — <one-line summary of the issue>

**Source:** Comment by <author>, <date>
**Screenshot:** <filename or "none"> — <one-sentence description of what it shows, if present>

**Classification:** GENUINE BUG | INTENDED BEHAVIOUR | OUT OF SCOPE | UNCERTAIN

**Reasoning:**
<Concise explanation of why you classified it this way. For INTENDED BEHAVIOUR, cite the ADR or doc by name and section. For OUT OF SCOPE, reference what was and was not in the AC. For UNCERTAIN, lay out both sides.>

**Proposed action:**
<For GENUINE BUG: the specific fix — file, function, change, and test impact.>
<For INTENDED BEHAVIOUR: draft push-back reply for the Jira comment.>
<For OUT OF SCOPE: suggest creating a follow-up ticket. Propose a one-line summary for the new ticket.>
<For UNCERTAIN: present both options — fix vs push back — with your recommendation.>

---

After presenting all classified points, check if there are any UNCERTAIN items:

- **If UNCERTAIN items exist:** output:

```
## Decision required

For each UNCERTAIN item above, please tell me what to do:
- fix — treat it as a genuine bug and proceed with the proposed fix
- push-back — treat it as intended / out of scope and post the push-back reply
- skip — take no action on this point for now

Reply with: "1: fix, 2: push-back, 3: skip" (or however many items there are).
```

Wait for the user's decisions before proceeding.

- **If no UNCERTAIN items exist:** skip the decision step and proceed directly to Step 9.

## Step 9 — Apply fixes for GENUINE BUG and user-accepted items

Compile the final fix list: all GENUINE BUG items plus any UNCERTAIN items the user chose to fix (if any UNCERTAIN items existed). If there were no UNCERTAIN items, the fix list is simply all GENUINE BUG items.

If the fix list is empty (no GENUINE BUGs and no UNCERTAIN items accepted for fixing), skip the edit / verify / commit / push steps entirely and proceed directly to Step 10.

Otherwise:

1. For each fix in the list:
   - Read the relevant source file(s) before editing.
   - Apply the change.
   - If the fix requires a new or updated test, write it following TDD conventions (see CLAUDE.md).
2. After all fixes are applied, run `scripts/verify.sh` and resolve any failures before continuing.
3. Commit all changes together:
   ```bash
   git add <specific files> && git commit -m "<TICKET_ID>: address QA feedback"
   ```
4. Push the commit:
   ```bash
   git push
   ```
   Wait for the push to complete before proceeding to the Jira comment step.

## Step 10 — Confirm before posting to Jira

Before posting anything to Jira, show the user the exact comment that will be posted and ask for explicit approval:

> "Ready to post the following comment to `TICKET_ID`. Please review and confirm (yes / edit / cancel):"

Then display the full comment body as it will appear (plain text, not ADF). If the user says:

- **yes** — proceed to post.
- **edit** — ask what they'd like changed, update the draft, and show it again. Do not post until the user confirms with "yes".
- **cancel** — do not post. Tell the user: "Comment not posted. You can re-run `/qa-review-action` at any time to post it."

Only proceed with the curl command below once the user has said "yes".

Format the approved summary as Atlassian Document Format (ADF) JSON and post it as a comment on the ticket:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment" \
  -H "Content-Type: application/json" \
  -d '<ADF comment body>'
```

Structure the comment as follows:

**QA Review Response**

For each QA point, one bullet:

- **Fixed** `[N]` — <one-line description of what was changed>
- **Intended behaviour** `[N]` — <brief explanation> (cite the ADR)
- **Out of scope** `[N]` — <brief explanation + follow-up ticket suggestion if applicable>
- **Pushed back** `[N]` (user decision) — <brief explanation>
- **Skipped** `[N]` (user decision) — no action taken

Confirm HTTP 201 to the user, or report the error if it failed.

## Step 11 — Transition ticket if all QA points are resolved

If **every** QA point is either Fixed, Intended Behaviour, or Out of Scope (i.e. no open defects remain), ask the user:

> "All QA points have been addressed. Should I move `TICKET_ID` to **Ready for Testing** (for re-testing)? Reply **yes** to transition, or **no** to leave the status unchanged."

If the user replies **yes** (or any affirmative like "yes", "do it", "go ahead"), fetch transitions and apply "Ready for Testing":

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/transitions"
# then POST the matching transition id
```

---

## Notes

- When classifying INTENDED BEHAVIOUR, require an explicit reference. "It probably makes sense" is not sufficient.
- Push-back replies must be respectful and cite the specific ADR, design doc, or acceptance criteria that supports the position.
- If a fix touches multiple files, commit them together in one commit — not separately.
- Screenshots are evidence, not decoration — describe what they show and use that description as part of your classification reasoning.
