# Check nightly CI runs and triage failures

Review the most recent nightly (scheduled) pipeline runs for this repo, diagnose any failures, and action them.

---

## Step 1 — Fetch recent scheduled runs

Fetch the most recent scheduled runs (GitHub Actions shown; adapt to your CI). Look at the last 7 days:

```bash
gh run list --event schedule --limit 20 --json databaseId,conclusion,createdAt,workflowName
```

For each nightly run, note:

- Run ID and workflow name
- Triggered at (date/time)
- Overall status (success / failed / running)

## Step 2 — Identify failures

List every failed nightly run. For each failure:

1. Fetch the failed jobs and their logs: `gh run view <run-id> --log-failed`
2. Read the logs carefully and identify the root cause.

Categorise each failure as one of:

- **Flake** — non-deterministic failure (network timeout, race condition, transient infra)
- **Regression** — a code change broke something
- **Config** — CI config, environment variable, or secret issue
- **Infra** — underlying infrastructure problem (disk, memory, runner crash)
- **Unknown** — cannot determine from logs alone

## Step 3 — Summarise findings

Print a table:

```
| Run | Date | Status | Job | Category | Root cause (1 line) |
|-----|------|--------|-----|----------|---------------------|
```

If all nightly runs are passing, output: "✅ All nightly runs passing — nothing to action." and stop.

## Step 4 — For each Regression or Config failure

These are actionable. For each one:

1. Identify the affected files, tests, or config.
2. Read the relevant source files to understand the failure.
3. Propose a concrete fix plan (what to change, where, why).
4. Ask: "Should I create an issue and pick it up for [failure description]?"
   - If yes → run `/capture` to log it, then run `/pickup <issue>` to start work.
   - If no → note it and move on.

## Step 5 — For each Flake failure

1. Check if the flake has occurred more than twice in the last 7 days.
2. If yes → it is chronic and needs fixing. Propose a fix plan and ask whether to create an issue.
3. If no → log it as a known flake and move on.

## Step 6 — For Infra failures

Flag to the user. These are not fixable via code — they need infra investigation. Note the run ID and affected jobs so the user can escalate.

## Step 7 — Final report

Summarise what was found and what was actioned:

- Runs reviewed
- Failures found (by category)
- Issues created (if any)
- Recommended next steps
