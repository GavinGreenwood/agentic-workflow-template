# Capture conversation to a GitHub issue + commit

Review the full conversation so far and do the following:

## Step 1 — Determine issue type

- If the conversation is fixing broken/incorrect behaviour → label `bug`
- If the conversation is adding new functionality → label `enhancement`
- Otherwise → no type label

## Step 2 — Create the issue

```bash
gh issue create \
  --title "<concise summary of what was discussed/fixed>" \
  --label "<bug|enhancement>" \
  --assignee "@me" \
  --body "<brief description: what the problem was, what was done, any relevant context>

_Actioned by Claude Code_"
```

Capture the issue number from the output URL.

## Step 3 — Place it on the board

Add the new issue to the project board in the **Backlog** column:

```bash
scripts/set-project-status.sh <issue-number> "Backlog"
```

The helper adds the issue to the board if it isn't already there, then sets its
status. Board owner/number come from `.env` (see `.env.example` and
CONTRIBUTING.md § Project board). If the board isn't configured, the helper
warns and no-ops — but for this repo board tracking is required, so configure it.

## Step 4 — Commit changes (if any)

Check `git status`. If there are modified/untracked files relevant to what was discussed:

- Stage the relevant files
- Commit with the issue number and a concise message following CONTRIBUTING.md conventions:
  - Format: `<type>(#<issue-number>): <short description>`
  - Types: `fix`, `feat`, `refactor`, `chore`

If there are no changes, skip the commit and confirm the issue was created.

## Step 5 — Report back

Tell the user:

- The issue number, title, and URL
- Whether a commit was made (and the commit message if so)
