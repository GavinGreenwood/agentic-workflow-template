# Morning routine — nightly CI triage + Dependabot review

Run the full morning maintenance sequence in order.

---

## Step 1 — Main branch health check

Use the `gh` CLI to fetch the most recent workflow runs for this repo triggered by a push to the `main` branch. Look at the most recent 3 completed push-triggered runs on `main` (not scheduled runs).

```bash
gh run list --branch main --event push --limit 10 --json databaseId,displayTitle,status,conclusion,createdAt,headSha,workflowName
```

Filter to `status: completed` runs only (skip any that are `in_progress`). For each run:

- Note the run ID, workflow name, commit SHA, triggered-at time, and conclusion.

Determine the **current health of main**:

- **Green** — the most recent push pipeline passed. Main is healthy.
- **Red** — the most recent push pipeline failed. Main is broken.
- **Unknown** — no recent push pipelines found (e.g. no merges since the last check).

If main is **Red**:

1. Fetch the failed jobs: `gh run view <run-id> --json jobs`
2. Fetch logs for each failed job: `gh run view <run-id> --log-failed`
3. Read the logs and identify the root cause.
4. Print a prominent warning:

```
⚠️  MAIN IS BROKEN
Pipeline: <number> — <date>
Failed job: <job name>
Root cause: <one-line summary>
```

4. Ask: "Should I create a Jira ticket and pick this up now?"
   - If yes → run `/capture` to log it, then run `/pickup <ticket>` to start work immediately.
   - If no → note it and continue.

If main is **Green**, output: "✅ Main is green." and continue.

If main is **Unknown** (no recent push pipelines found), output: "⚪ Main health unknown — no push pipelines found since last check." and continue. Do not treat Unknown as a failure.

---

## Step 2 — Nightly CI check

Run `/nightly-check` in full.

Wait for it to complete before proceeding. If it surfaces any tickets that were created and picked up, note the ticket IDs — they are now in progress.

## Step 3 — Dependabot review

Run `/dependabot-review` in full.

Wait for it to complete before proceeding.

## Step 4 — Morning summary

Print a final summary of everything actioned this morning:

```
## Morning Summary — <today's date>

### Main branch
<Green / Red — root cause if broken, ticket created if actioned>

### Nightly CI
<pass/fail counts, tickets created, any open issues>

### Dependabot
<merged PRs, failing PRs diagnosed, PRs pending>

### Next up
<any tickets now In Progress that need work today>
```

If there is nothing to action across all steps, output: "✅ All clear — main is green, nightly runs green, no Dependabot PRs outstanding."
