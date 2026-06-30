---
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git switch:*), Bash(git pull:*), Bash(git log:*), Bash(git rev-parse:*)
description: Switch to main and pull latest. If on a feature branch, checks for uncommitted changes and whether the branch was pushed before deleting it.
---

## Context

- Current branch: !`git branch --show-current`
- Git status (uncommitted changes): !`git status --porcelain`
- Branches and their remote tracking status: !`git branch -v`

## Your Task

Follow this decision tree exactly:

### Step 1 — Check for uncommitted changes

Run: `git status --porcelain`

If there are any uncommitted changes (staged or unstaged), **stop immediately** and tell the user:

> "You have uncommitted changes on `<branch>`. Please commit, stash, or discard them before switching to main."

Do not proceed further.

---

### Step 2 — Check if already on main

Run: `git branch --show-current`

If already on `main`, just run `git pull` and report that main is up to date. Done.

---

### Step 2.5 — Last-chance re-enrichment flag

Before deleting any feature branch that has unique commits, make sure the re-enrichment flag wasn't forgotten. First determine whether the branch has unique commits — this gates the whole step:

```bash
git log main..HEAD --oneline --max-count=1
```

If this returns **nothing**, the branch has no unique commits — **skip this step entirely** and continue to Step 3.

If it returns a commit, then while still **on the feature branch** (the diff vs `main` is only available now), invoke the `flag-reenrich` skill (no arguments — it derives the ticket from the branch).

- It is idempotent: if `/pr` already flagged the ticket, this no-ops; if the flag was missed, this is the last safety net before the branch is gone.
- If the branch is a `chore/` branch or has no associated ticket, `flag-reenrich` stops on its own — no action needed.

---

### Step 3 — Feature branch: check for unique commits and remote tracking

Run these commands:

- `git log main..HEAD --oneline --max-count=1` — check if the branch has any commits that aren't on main.
- `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null` — check if a remote tracking branch exists.
- If a tracking branch exists: `git log @{u}..HEAD --oneline --max-count=1` — check if there are commits not yet pushed to upstream.

**Branch has NO unique commits** (no commits ahead of main, regardless of whether it was pushed):

- Switch to main: `git checkout main`
- Pull latest: `git pull`
- Delete the local branch: `git branch -d <branch>`
- Notify the user: "Switched to main, pulled latest, and deleted `<branch>` (no unique commits)."

**Branch has been pushed** (has commits ahead of main AND remote tracking branch exists AND no commits ahead of upstream):

- Switch to main: `git checkout main`
- Pull latest: `git pull`
- Delete the local branch: `git branch -d <branch>`
- Notify the user: "Switched to main, pulled latest, and deleted `<branch>` (was pushed to remote)."

**Branch has unpushed commits** (has commits ahead of main AND either no remote tracking branch OR commits ahead of upstream):

- Ask the user: "Branch `<branch>` has unpushed commits. Delete it anyway, or keep it?"
- If user says delete: switch to main, pull, then `git branch -D <branch>` and notify.
- If user says keep: switch to main, pull, and leave the branch in place.

---

### Summary output

Always end with a clear one-line status: what branch you're on now, whether you deleted anything, and whether pull succeeded.
