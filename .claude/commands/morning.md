# Morning routine — nightly CI triage + Dependabot review

Run the full morning maintenance sequence in order.

---

## Step 1 — Main branch health check

Fetch the most recent CI runs for the `main` branch (GitHub Actions shown; adapt to your CI):

```bash
gh run list --branch main --event push --limit 3 --json databaseId,conclusion,headSha,createdAt,workflowName
```

Determine the **current health of main**:

- **Green** — the most recent push run passed. Main is healthy.
- **Red** — the most recent push run failed. Main is broken.
- **Unknown** — no recent push runs found (e.g. no merges since the last check).

If main is **Red**:

1. Fetch the failed run's jobs and logs: `gh run view <run-id> --log-failed`
2. Read the logs and identify the root cause.
3. Print a prominent warning:

```
⚠️  MAIN IS BROKEN
Run: <id> — <date>
Failed job: <job name>
Root cause: <one-line summary>
```

4. Ask: "Should I create an issue and pick this up now?"
   - If yes → run `/capture` to log it, then run `/pickup <issue>` to start work immediately.
   - If no → note it and continue.

If main is **Green**, output: "✅ Main is green." and continue.

If main is **Unknown**, output: "⚪ Main health unknown — no push runs found since last check." and continue. Do not treat Unknown as a failure.

---

## Step 2 — Nightly CI check

Run `/nightly-check` in full.

Wait for it to complete before proceeding. If it surfaces any issues that were created and picked up, note the issue numbers — they are now in progress.

## Step 3 — Dependabot review

Run `/dependabot-review` in full.

Wait for it to complete before proceeding.

## Step 4 — Morning summary

Print a final summary of everything actioned this morning:

```
## Morning Summary — <today's date>

### Main branch
<Green / Red — root cause if broken, issue created if actioned>

### Nightly CI
<pass/fail counts, issues created, any open problems>

### Dependabot
<merged PRs, failing PRs diagnosed, PRs pending>

### Next up
<any issues now in progress that need work today>
```

If there is nothing to action across all steps, output: "✅ All clear — main is green, nightly runs green, no Dependabot PRs outstanding."
