---
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git pull:*), Bash(git fetch:*), Bash(git tag:*), Bash(git push:*), Bash(git log:*), Bash(grep:*), Bash(sort:*), Bash(tail:*)
description: Bump main's semver tag by one minor version and push the new tag.
---

## Context

- Current branch: !`git branch --show-current`
- Uncommitted changes: !`git status --porcelain`
- Latest semver tags reachable from main: !`git tag --list --merged main | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -5`

## Your Task

This command always bumps the **minor** (middle) number and resets the patch to `0` — e.g. `0.7.0` → `0.8.0`. This is a deliberate hardcoded simplification for now; it does not inspect commit history to decide whether a major or patch bump would be more correct. There is no code change and nothing to commit — this is a tag-only operation.

### Step 1 — Get on latest main

- If `git status --porcelain` shows any uncommitted changes, stop and tell the user to commit or stash first. Do not tag over a dirty working tree.
- `git checkout main`
- `git pull`
- `git fetch --tags --prune-tags` — make sure local tags match origin, in case someone else already bumped since you last fetched.

### Step 2 — Find the current version

- `git tag --list --merged main | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1`
- This strict `X.Y.Z` filter is intentional — a repo's tag history can accumulate malformed/noise tags (e.g. a `v`-prefixed duplicate, a typo'd tag). Ignore anything that doesn't match exactly.
- If nothing matches, stop and ask the user what the starting version should be. Do not guess a starting point.

### Step 3 — Compute the new version

- Parse `X.Y.Z` from the tag found in Step 2.
- New version is `X.(Y+1).0`.
- Example: `0.7.0` → `0.8.0`.

### Step 4 — Tag and push

- `git tag <new-version>` on the current `main` HEAD.
- `git push origin <new-version>`.
- If the push is rejected by the local pre-push hook, stop and ask the user to confirm before retrying with `git push origin <new-version> --no-verify`. The hook runs the full lint/typecheck/test pipeline, which doesn't apply to a tag-only push with no file changes, but per CLAUDE.md rule 6 `--no-verify` still requires explicit approval each time. Do not use `--no-verify` for anything else this command doesn't explicitly cover.

### Step 5 — Report

Tell the user the old version, the new version, and confirm the tag was pushed to origin.
