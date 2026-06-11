# Review and action open Dependabot PRs

Fetch all open Dependabot PRs for this repo, check their build status, and approve + merge the green ones. Diagnose and action the failing ones.

---

## Step 1 — List open Dependabot PRs

```bash
gh pr list --author "app/dependabot" --state open --json number,title,url,headRefName,createdAt,labels --limit 50
```

If there are no open Dependabot PRs, output: "✅ No open Dependabot PRs." and stop.

## Step 2 — For each PR, fetch build status

```bash
gh pr checks <number> --json name,state,conclusion,link
```

Classify each PR as:

- **Green** — all checks passed
- **Failing** — one or more checks failed
- **Pending** — checks still running
- **No checks** — no CI configured for this PR (treat as Failing — do not merge)

## Step 3 — Action Green PRs

For each Green PR:

1. Review the PR title to understand what is being updated (package name, version bump, major/minor/patch).
2. Check if it is a **major version bump** (breaking change risk):
   - If major → print a warning and ask: "PR #<number> is a major bump (<package> <old> → <new>). Approve and merge anyway?"
   - Wait for confirmation before proceeding.
   - If minor or patch → proceed automatically.
3. Approve the PR:
   ```bash
   gh pr review <number> --approve --body "Dependabot auto-approval: all checks green, patch/minor bump.\n\n_Actioned by Claude Code_"
   ```
4. Merge the PR using squash merge:
   ```bash
   gh pr merge <number> --squash --delete-branch
   ```
5. Confirm merge succeeded.

## Step 4 — Action Failing PRs

For each Failing PR:

1. Identify which checks failed: `gh pr checks <number>`
2. Fetch the failed job logs from your CI (e.g. `gh run view <run-id> --log-failed`). Read the logs and identify the root cause.
3. Categorise the failure:
   - **Dependency conflict** — the new version conflicts with another package
   - **Type error** — the new version changed a type signature
   - **Test failure** — a test broke due to changed behaviour
   - **Lint failure** — new version introduced a linting issue
   - **Flake / transient** — looks like a non-deterministic failure
   - **Unknown**

4. For Flake failures → re-trigger the checks:

   ```bash
   gh pr comment <number> --body "@dependabot rebase\n\n_Actioned by Claude Code_"
   ```

5. For fixable failures (conflict, type error, test, lint):
   - Describe the fix needed (1–3 sentences).
   - Assess whether the fix is straightforward (one-liner, clear root cause) or complex (needs research, risky).
   - Ask: "Should I check out PR #<number> and attempt to fix it, or close it and let Dependabot re-raise later?"
   - If fix → check out the branch, apply the fix, push, and wait for CI to re-run.
   - If close → close the PR with an explanation comment and let Dependabot re-raise when the ecosystem catches up:
     ```bash
     gh pr close <number> --comment "## Dependabot Review\n\n**Closing** — <reason the fix isn't viable now, e.g. upstream incompatibility>. Dependabot will re-raise this once <condition>.\n\n_Actioned by Claude Code_"
     ```
   - Default to **close** when: it is a major bump with ecosystem-wide incompatibility, the fix requires significant code changes, or the upstream package hasn't yet released a compatible version.
   - Default to **fix** when: it is a minor/patch bump, the fix is a one-liner, and the change is low-risk.

6. For Unknown failures → leave a diagnostic comment and flag to the user.

## Step 5 — Pending PRs

For PRs where checks are still running, note them and skip. They will be picked up next time this command runs.

## Step 6 — Final report

Print a summary table:

```
| PR | Package | Bump | Status | Action taken |
|----|---------|------|--------|--------------|
```

And a one-line summary: "Merged X, diagnosed Y, skipped Z (pending)."
