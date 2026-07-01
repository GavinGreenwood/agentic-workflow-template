Fix failing GitHub Actions jobs on the current branch.

Uses the `gh` CLI — no extra credentials needed beyond the GitHub auth already configured.

## Step 1 — Identify the branch

Run `git branch --show-current`. Extract the ticket ID from the branch name (e.g. `wei-144-...` → `WEI-144`).

## Step 2 — Fetch the latest run for this branch

```bash
gh run list --branch <branch> --limit 5 --json databaseId,displayTitle,status,conclusion,createdAt,workflowName
```

Take the most recent completed run. If none found: output "No CI run found for this branch." and stop.

## Step 3 — Fetch failed jobs

```bash
gh run view <run-id> --json jobs
```

Identify all failed jobs. Skip jobs that are still running or were skipped.

If no failed jobs: output "✅ No failing jobs on `<branch>`." and stop.

## Step 4 — Fetch logs (parallel)

```bash
gh run view <run-id> --log-failed
```

Read every log end-to-end — the root cause is usually in the last error block. For targeted job-level logs:

```bash
gh run view <run-id> --job <job-id> --log
```

## Step 5 — Diagnose: flake or real failure?

Before touching code, check whether the failure is a transient flake:

- Run the same check locally (e.g. `npm run lint`, `npm run typecheck`, `npm run test`).
- Cross-reference the failed job name against the files changed on this branch (`git diff main...HEAD --name-only`). If the job lints/tests code that this branch does not touch, a flake is likely.

**If it looks like a flake** — (i) the check passes locally **and** (ii) the failing job touches files this branch did not change, **or** (iii) the logs contain a known-transient signature (network timeout, registry 5xx, install blip): do NOT make a code change. Instead, trigger a rerun immediately:

```bash
gh run rerun <run-id> --failed
```

If the command succeeds: output "Flake detected — triggered rerun of run `<run-id>`. No code changes made." then stop.
If it fails: output the error and stop — do not attempt a code fix until the rerun issue is resolved.

**If it is a real failure** (error implicates files changed on this branch, or reproduces locally): proceed to Step 6.

## Step 6 — Fix

Read only the files the logs implicate. Apply the minimal fix. Do not refactor surrounding code.

Commit using the ticket ID: `fix(<TICKET-ID>): <short description>` and push.
