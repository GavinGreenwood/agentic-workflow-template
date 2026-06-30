Fix failing CircleCI jobs on the current branch.

Requires `CIRCLECI_TOKEN` and `CIRCLECI_PROJECT_SLUG` (e.g. `gh/your-org/your-repo`) set in `.env`.

## Step 1 — Identify the branch

Run `git branch --show-current`. Extract the ticket ID from the branch name (e.g. `wei-144-...` → `WEI-144`).

## Step 2 — Fetch the latest pipeline for this branch

Use the CircleCI REST API (via `curl` with `CIRCLECI_TOKEN` from `.env`) to list recent pipelines for this repo filtered to the current branch. Take the most recent one.

If none found: output "No CI pipeline found for this branch." and stop.

## Step 3 — Fetch failed jobs

Fetch the workflow(s) for that pipeline, then the jobs for each workflow. Identify all failed jobs. Skip jobs that are still running.

If no failed jobs: output "✅ No failing jobs on `<branch>`." and stop.

## Step 4 — Fetch logs (parallel)

Fetch the full logs for all failed jobs in parallel. Read every log end-to-end — the root cause is usually in the last error block.

## Step 5 — Diagnose: flake or real failure?

Before touching code, check whether the failure is a transient flake:

- Run the same check locally (e.g. `npm run lint`, `npm run typecheck`, `npm run test`).
- Cross-reference the failed job name against the files changed on this branch (`git diff main...HEAD --name-only`). If the job lints/tests code that this branch does not touch, a flake is likely.

**If it looks like a flake** — (i) the check passes locally **and** (ii) the failing job touches files this branch did not change, **or** (iii) the logs contain a known-transient signature (network timeout, registry 5xx, install blip): do NOT make a code change. Instead, trigger a workflow rerun immediately:

```bash
source .env && : "${CIRCLECI_TOKEN:?CIRCLECI_TOKEN not set in .env}" && curl -s --fail-with-body -X POST \
  "https://circleci.com/api/v2/workflow/<workflow-id>/rerun" \
  -H "Circle-Token: $CIRCLECI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_failed": true}'
```

If the curl command exits successfully (HTTP 2xx): output "Flake detected — triggered rerun of workflow `<workflow-id>`. No code changes made." then stop.
If it fails (non-2xx or network error): output the error response and stop — do not attempt a code fix until the rerun issue is resolved.

**If it is a real failure** (error implicates files changed on this branch, or reproduces locally): proceed to Step 6.

## Step 6 — Fix

Read only the files the logs implicate. Apply the minimal fix. Do not refactor surrounding code.

Commit using the ticket ID: `fix(<TICKET-ID>): <short description>` and push.
