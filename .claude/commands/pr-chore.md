Raise a PR for a specific set of files discussed in the current session — tooling fixes, command updates, config changes. No issue required.

**The current branch must not be touched.** All work happens in a temporary git worktree so the active feature branch (and any other agent working on it) is completely unaffected.

**No PROGRESS.md needed.** Chore PRs are small and self-contained — do not create or update PROGRESS.md for them.

---

## Step 1 — Identify the files

List the exact files to include in this PR. These come from the discussion — do not infer or add extra files. Confirm with the user if unsure.

## Step 2 — Create a temporary worktree

From the repo root:

```bash
CHORE_BRANCH="chore/<short-description>"
git worktree add -b "$CHORE_BRANCH" /tmp/chore-pr origin/main
```

This creates a new branch from `main` in a temporary directory with a full checkout. The current branch is never checked out or modified.

## Step 3 — Copy the files into the worktree

For each file identified in Step 1, copy it from the current working tree into the worktree at the same relative path:

```bash
cp <file> /tmp/chore-pr/<file>
```

Create any intermediate directories as needed.

Confirm the copy succeeded before doing anything else — every Step 1 file must be present in the worktree. `git status` is not sufficient: a copied file that happens to match `origin/main` exactly will not appear in `status`, so check each file's existence explicitly:

```bash
for f in <file1> <file2> ...; do
  test -f "/tmp/chore-pr/$f" && echo "present: $f" || echo "MISSING: $f"
done
```

Only proceed to Step 4 once you have verified the files are present in the worktree. Do not restore the current branch until this is confirmed, or the work could be lost.

## Step 4 — Restore the current branch immediately

Now that the files are safely in the worktree, restore the current branch so it returns to a clean state at once. Only act on the files identified in Step 1.

**Run every command in this step from the original working tree — not from `/tmp/chore-pr`.**

First, from the Step 1 list, separate the files by git state (use `git status --short`):

- Tracked files with uncommitted modifications (staged, unstaged, or both) → restore from HEAD. Use `--staged --worktree` so both the index and the working tree are reset:

```bash
git restore --staged --worktree <modified-files>
```

- Newly-created (untracked) files → delete them (`git restore` will not remove untracked files):

```bash
rm -f <new-files>
```

Then confirm the current branch no longer shows any of the Step 1 files:

```bash
git status --short
```

The only entries remaining should be pre-existing, unrelated changes belonging to the branch — leave those untouched.

If any Step 1 file was already committed on the feature branch (not just an uncommitted edit), leave it and note this to the user — do not rewrite history.

**Only ever touch the exact files from Step 1.** Never run `git restore .`, `git checkout .`, or any blanket reset — the branch may hold unrelated in-progress work from other agents.

**Do not delete PROGRESS.md unless it is one of the Step 1 chore files.** A PROGRESS.md on the branch normally belongs to the active feature session — leave it alone.

## Step 5 — Run verification from the worktree

```bash
cd /tmp/chore-pr && npm install && bash scripts/verify.sh
```

If it fails, fix the issues inside the worktree. The original copies are already gone from the current branch (Step 4), so all fixes happen in the worktree. Re-run until it passes.

## Step 6 — Commit and push from the worktree

Before committing, remove PROGRESS.md if it exists in the worktree — it must never be committed:

```bash
cd /tmp/chore-pr
rm -f PROGRESS.md
git add <files>
git commit -m "chore: <description>"
git push -u origin "$CHORE_BRANCH"
```

## Step 7 — Raise the PR

```bash
gh pr create \
  --base main \
  --head "$CHORE_BRANCH" \
  --title "chore: <description>" \
  --body "..."
```

PR body should cover: what changed, why, and any risk/rollback notes. End with:
`_Actioned by Claude Code_`

Output the PR URL, then open it: `gh pr view <number> --web`.

## Step 8 — Self-review

Fetch the diff: `gh pr diff <number>`

Review against: correctness, TypeScript strictness, security, conventions, docs sync.
Classify findings: 🔴 Must fix | 🟡 Should fix | 🔵 Consider.

Post a comment via `gh pr comment <number>`:

```
## AI Pre-Review

Self-review completed.

### Findings

<list findings with classification emoji, file:line, one-sentence description>

_or_ ✅ No findings — all lenses clear.

### Summary

<1–2 sentence overall assessment>

_Actioned by Claude Code_
```

If there are 🔴 Must fix findings: fix them in the worktree, push a follow-up commit, note as "Fixed prior to this comment."

## Step 9 — Clean up the worktree

```bash
git worktree remove --force /tmp/chore-pr
```

`--force` is required on Windows — `node_modules` makes the directory non-empty, which causes a plain `git worktree remove` to fail.

If any step fails, stop and explain. Do not force or skip gates. Do not touch the current branch beyond Step 4's targeted restore.
