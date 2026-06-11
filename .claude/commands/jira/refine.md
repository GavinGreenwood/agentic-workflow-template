Review a Jira ticket by ID: surface clarification questions, propose implementation approaches in priority order, then post conclusions as a comment on the ticket.

**Ticket:** $ARGUMENTS

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a bare number (e.g. `25`), prepend `$JIRA_PROJECT_KEY-`. Store the result as `TICKET_ID` and use it for all curl commands below.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_ACCOUNT_ID` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the ticket and its comments

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID?expand=subtasks,renderedFields"
```

Extract summary, description, assignee, status, issue type, parent, subtasks, issue links, labels, and priority.

Then fetch the comment thread, ordered oldest-first:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment?orderBy=created"
```

For each comment, extract `author.displayName`, `created`, and the plain-text body. Mark any comment whose body ends with `_Actioned by Claude Code_` as **Claude-authored** — treat the rest as **human-authored**. Human-authored comments represent decisions that have already been made and take precedence over any prior Claude analysis.

## Step 3 — Check assignee and status

If the ticket is already assigned or in development, ask the user to confirm they still want to refine it. Mention the user it is assigned to, the current status, and how many days it has been in that status.

## Step 4 — Fetch parent/epic and subtask context

If the ticket has a `fields.parent`, fetch that ticket to understand the broader story or epic. For each subtask key, fetch the full issue.

## Step 5 — Read relevant codebase context

Based on the ticket's domain (frontend, backend, infrastructure, shared), read the relevant documentation and source files to understand the current state before forming opinions:

- Always: `CONTRIBUTING.md`, `docs/development/engineering-standards.md`
- Architecture changes: `docs/architecture/`, `docs/adr/`
- Quality/testing: `docs/development/quality-strategy.md`

## Step 6 — Analyse the ticket

With all context gathered, think through:

1. **Clarity** — Is the acceptance criteria precise and testable? Are there ambiguous terms, missing edge cases, or unstated assumptions?
2. **Scope** — Is the scope appropriate? Could it be split? Does it implicitly require other changes not mentioned?
3. **Constraints** — What architectural, performance, security, or accessibility constraints apply?
4. **Approaches** — What are the distinct ways this could be implemented? Consider trade-offs in complexity, testability, reversibility, and alignment with existing patterns.
5. **Discussion** — Read the comments. Definitive answers by humans take precedence.

## Step 7 — Ask clarifications

- Ask clarifying questions to the user until you have a complete understanding of the ticket. For each question, reference the specific part of the ticket that is unclear. If the ticket is already clear, explicitly state that no clarifications are needed.
- If there are distinct alternatives to be considered, ask the user to select one. Present up to 2 pros and cons of each, state which you prefer and why, and rate each approach with 1–5 stars.

## Step 8 — Produce the refinement brief

Output a structured brief:

```
## Refinement: <ticket-id> — <summary>

### Clarifications needed
Specific questions referencing the exact unclear part of the description or AC.
If the ticket is clear, say so explicitly rather than inventing questions.

### Proposed approaches

**1. <Preferred approach — recommended>**
- What / Why preferred / Trade-offs / Risks

**2. <Alternative approach>**
- What / Why it was considered / Trade-offs

*(Add further alternatives only if genuinely distinct — do not pad)*

### Recommendation
One paragraph synthesising the preferred path, referencing the codebase context read in Step 5.

### Open questions before implementation
Numbered list — architectural or risk decisions, not ambiguities in the ticket text.

### Clarifications resolved
For every question that was clarified by the user, list the question and the answer verbatim.
This is an audit trail of how the ticket evolved — do not summarise.
Do not use block quotes, they break the ADF format.
```

## Step 9 — Post conclusions as a Jira comment

Format the brief above as Atlassian Document Format (ADF) JSON and post it as a comment on the ticket:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment" \
  -H "Content-Type: application/json" \
  -d '<ADF comment body>'
```

Structure it with headings for each section. End the comment with the line:

_Actioned by Claude Code_

Confirm to the user that the comment was posted successfully (HTTP 201) or report the error if it failed.

---

After posting, pause and ask: "Refinement posted — do you want to adjust anything before we plan the implementation?"
