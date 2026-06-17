Pick up a GitHub issue: assign it to me, read it fully with all linked context, then prepare to implement.

**Issue:** $ARGUMENTS

---

## Step 1 — Fetch the issue

```bash
gh issue view $ARGUMENTS --json number,title,body,assignees,labels,milestone,state,url
gh issue view $ARGUMENTS --comments
```

Extract: title, full body (description + acceptance criteria), assignees, labels, milestone, and the comment history. The latest comments often contain decisions or QA feedback that supersede the description — read them all.

## Step 2 — Assignee safety check

- If the issue is **unassigned** → proceed.
- If assigned to **me** (compare against `gh api user --jq .login`) → proceed.
- If assigned to **someone else** → STOP. Output: "Issue #$ARGUMENTS is assigned to [login] — are you sure you want to pick this up?" Do not proceed until the user confirms.

## Step 3 — Assign the issue to me and move it to In progress

```bash
gh issue edit $ARGUMENTS --add-assignee "@me"
scripts/set-project-status.sh $ARGUMENTS "In progress"
```

The second command moves the issue's card to **In progress** on the project
board (adding it to the board first if needed). Board config comes from `.env`
(see CONTRIBUTING.md § Project board).

## Step 4 — Fetch linked context

- If the issue body references other issues (`#N`), fetch each one for context.
- If the issue belongs to a milestone or epic-style tracking issue, fetch that too to understand the broader goal.

## Step 5 — Output a brief

Print a structured briefing so the work is clear before any code is written:

```
## Issue #$ARGUMENTS — <title>

**Labels:** <labels>
**Milestone:** <milestone, if any>
**Status:** assigned, in progress

### Description
<body>

### Linked issues
- #<n> — <title>
...

### Implementation notes
<what needs to be built, based on reading the issue and relevant docs>

### Open questions
<anything unclear that needs resolving before coding starts>
```

## Step 6 — Create the feature branch

Following CONTRIBUTING.md naming conventions, create and switch to a new branch:

```bash
git checkout main && git pull && git checkout -b <issue-number>-<short-description>
```

Use the issue number and a 2–4 word kebab-case description derived from the title (e.g. `42-fix-header-contrast`).

## Step 7 — Initialise PROGRESS.md

Create a `PROGRESS.md` file in the repo root as the session scratchpad (per CLAUDE.md). Seed it with the issue context so the session log starts with a clear baseline:

```markdown
# PROGRESS.md — #<issue-number>: <title>

**Branch:** <branch-name>
**Started:** <today's date>

## Plan

<high-level implementation approach derived from the issue brief>

## Progress

_Nothing logged yet._

## Decisions

_None yet._

## Open Questions

<carry over any open questions from the Step 5 brief>
```

If a `PROGRESS.md` already exists (leftover from a previous session), read it first, then overwrite it with the new session header — do not append to stale content.

---

After the briefing is output, the branch is created, and PROGRESS.md is initialised, pause and ask: "Ready to start — any questions before I begin?" Wait for the user's go-ahead before writing any code.
