Review a Jira ticket by ID: surface clarification questions, propose implementation approaches in priority order, then post conclusions as a comment on the ticket.

**Ticket:** $ARGUMENTS

---

## Step 0 — Normalise the ticket ID

If `$ARGUMENTS` is a bare number (e.g. `25`), prepend `$JIRA_PROJECT_KEY-` to get e.g. `PROJ-25`. Store the result as `TICKET_ID` and use it in place of `$ARGUMENTS` for all curl commands below.

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_ACCOUNT_ID` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Fetch the ticket and its comments

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID?expand=subtasks,renderedFields"
```

Parse the response and extract:

- `fields.summary`
- `fields.description` (full rendered text)
- `fields.assignee`
- `fields.status.name`
- `fields.issuetype.name`
- `fields.parent` (if present — epic or story)
- `fields.subtasks` (array of subtask keys)
- `fields.issuelinks` (linked issues)
- `fields.labels`
- `fields.priority.name`
- `fields.customfield_10014` (epic link, if present)

Then fetch the comment thread, ordered oldest-first:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment?orderBy=created"
```

For each comment, extract `author.displayName`, `created`, and the plain-text body. Comments represent decisions and context that already exist on the ticket and take precedence over any fresh analysis — read them all before proposing anything.

## Step 3 — Check assignee and status

If the ticket is already assigned or in development, ask the user to confirm if they still want to refine it. Remember to mention the JIRA user that the ticket is assigned to, the current status and how many days it has been in that status.

## Step 4 — Fetch parent/epic and subtask context

If the ticket has a `fields.parent`, fetch that ticket to understand the broader story or epic:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<parent-key>?expand=renderedFields"
```

For each key in `fields.subtasks`, fetch the full issue:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<subtask-key>?expand=renderedFields"
```

## Step 5 — Read relevant codebase context

Based on the ticket's domain (frontend, backend, infrastructure, shared), read the relevant documentation and source files to understand the current state before forming opinions:

- Always: `CONTRIBUTING.md`, `docs/development/engineering-standards.md`
- Architecture changes: `docs/architecture/context.md`, `docs/architecture/containers.md`, `docs/adr/`
- Frontend work: `docs/development/react-conventions.md`, `apps/web/`
- Backend work: `docs/development/backend-patterns.md`, `apps/api/`
- Quality/testing: `docs/development/quality-strategy.md`

## Step 6 — Analyse the ticket

With all context gathered, think through:

1. **Clarity** — Is the acceptance criteria precise and testable? Are there ambiguous terms, missing edge cases, or unstated assumptions?
2. **Scope** — Is the scope appropriate? Could it be split? Does it implicitly require other changes not mentioned?
3. **Constraints** — What architectural, performance, security, or accessibility constraints apply? Which documented patterns are relevant?
4. **Approaches** — What are the distinct ways this could be implemented? Consider trade-offs in complexity, testability, reversibility, and alignment with existing patterns.
5. **Discussion** – Read the comments. If there are any definitive answers by human users (not actioned by Claude Code), those take precedence.

## Step 7 — Ask clarifications

- Ask clarifying questions to the user until you have a complete understanding of the ticket. For each question, reference the specific part of the ticket that is unclear. If the ticket is already clear, explicitly state that no clarifications are needed.
- If there are distinct alternatives to be considered, ask the user to select one. Present up to 2 pros and cons of each alternative, and which ones you prefer and why. Highlight your preference in the name/id of each option and use 1-5 stars to rate each approach.

## Step 8 — Produce the refinement brief

Output a structured brief:

```
## Refinement: <ticket-id> — <summary>

### Clarifications needed
List questions where the ticket is ambiguous, incomplete, or where assumptions need validating.
Be specific — reference the exact part of the description or acceptance criteria that is unclear.
If the ticket is clear, say so explicitly rather than inventing questions.

### Proposed approaches

**1. <Preferred approach — recommended>**
- What: concise description of the approach
- Why preferred: alignment with existing patterns, testability, simplicity, reversibility
- Trade-offs: what you give up or accept
- Risks: what could go wrong

**2. <Alternative approach>**
- What: concise description
- Why it was considered: a legitimate reason it's viable
- Trade-offs: why it ranks lower

*(Add further alternatives only if genuinely distinct — do not pad)*

### Recommendation
One paragraph synthesising the preferred path and why, referencing the codebase context read in Step 5.

### Open questions before implementation
Numbered list of things that must be resolved before coding starts. Separate from clarifications — these are architectural or risk decisions, not ambiguities in the ticket text.

## Clarifications resolved
- Explain that these were the clarifications that were resolved by the user when asked by Claude Code.
- For every question that was clarified, list the question and the answer that was provided by the user. This is a record of how the ticket evolved from its original state to the clarified state.
- Do not summarise the questions or the answers, this is an audit trail.
- Do not use block quotes, they break the ADF format.

```

## Step 9 — Post conclusions as a Jira comment

Format the brief above as Atlassian Document Format (ADF) JSON and post it as a comment on the ticket:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/$TICKET_ID/comment" \
  -H "Content-Type: application/json" \
  -d '<ADF comment body>'
```

The comment body must use ADF. Structure it with headings for each section (Clarifications, Approaches, Recommendation, Open questions).

Confirm to the user that the comment was posted successfully (HTTP 201) or report the error if it failed.

---

After posting, pause and ask: "Refinement posted — do you want to adjust anything before we plan the implementation?"
