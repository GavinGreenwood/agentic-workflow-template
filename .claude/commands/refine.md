Review a GitHub issue by number: surface clarification questions, propose implementation approaches in priority order, then post conclusions as a comment on the issue.

**Issue:** $ARGUMENTS

---

## Step 1 — Fetch the issue and its comments

```bash
gh issue view $ARGUMENTS --json number,title,body,assignees,labels,milestone,state,url
gh issue view $ARGUMENTS --comments
```

For each comment, note the author and date. Mark any comment whose body ends with `_Actioned by Claude Code_` as **Claude-authored** — treat the rest as **human-authored**. Human-authored comments represent decisions that have already been made and take precedence over any prior Claude analysis.

## Step 2 — Check assignee and status

If the issue is already assigned or in development, ask the user to confirm they still want to refine it. Mention who it is assigned to and how long it has been open.

## Step 3 — Fetch linked context

If the issue references other issues or a tracking/epic issue, fetch those too to understand the broader goal.

## Step 4 — Read relevant codebase context

Based on the issue's domain (frontend, backend, infrastructure, shared), read the relevant documentation and source files to understand the current state before forming opinions:

- Always: `CONTRIBUTING.md`, `docs/development/engineering-standards.md`
- Architecture changes: `docs/architecture/`, `docs/adr/`
- Quality/testing: `docs/development/quality-strategy.md`

## Step 5 — Analyse the issue

With all context gathered, think through:

1. **Clarity** — Is the acceptance criteria precise and testable? Are there ambiguous terms, missing edge cases, or unstated assumptions?
2. **Scope** — Is the scope appropriate? Could it be split? Does it implicitly require other changes not mentioned?
3. **Constraints** — What architectural, performance, security, or accessibility constraints apply? Which documented patterns are relevant?
4. **Approaches** — What are the distinct ways this could be implemented? Consider trade-offs in complexity, testability, reversibility, and alignment with existing patterns.
5. **Discussion** — Read the comments. If there are definitive answers from humans, those take precedence.

## Step 6 — Ask clarifications

- Ask clarifying questions to the user until you have a complete understanding of the issue. For each question, reference the specific part of the issue that is unclear. If the issue is already clear, explicitly state that no clarifications are needed.
- If there are distinct alternatives to be considered, ask the user to select one. Present up to 2 pros and cons of each alternative, and which you prefer and why. Highlight your preference and rate each approach with 1–5 stars.

## Step 7 — Produce the refinement brief

Output a structured brief:

```
## Refinement: #<issue-number> — <title>

### Clarifications needed
List questions where the issue is ambiguous, incomplete, or where assumptions need validating.
Be specific — reference the exact part of the description or acceptance criteria that is unclear.
If the issue is clear, say so explicitly rather than inventing questions.

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
One paragraph synthesising the preferred path and why, referencing the codebase context read in Step 4.

### Open questions before implementation
Numbered list of things that must be resolved before coding starts. Separate from clarifications — these are architectural or risk decisions, not ambiguities in the issue text.

### Clarifications resolved
For every question that was clarified by the user, list the question and the answer verbatim. This is an audit trail of how the issue evolved from its original state to the clarified state — do not summarise.
```

## Step 8 — Post conclusions as an issue comment

Post the brief as a comment on the issue:

```bash
gh issue comment $ARGUMENTS --body-file <temp-file-with-brief>
```

End the comment with the line:

_Actioned by Claude Code_

Confirm to the user that the comment was posted successfully, or report the error if it failed.

---

After posting, pause and ask: "Refinement posted — do you want to adjust anything before we plan the implementation?"
