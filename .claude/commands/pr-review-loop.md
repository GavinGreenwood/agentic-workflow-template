Review all open PRs raised by other team members — not drafts, not your own, not already approved. For each PR, check whether prior AI review comments were addressed, run a fresh code review, and post a combined finding. Loop until every PR has been reviewed this session.

Usage: `/pr-review-loop` — no arguments needed.

---

## Step 0 — Discover open PRs

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,author,isDraft --limit 50
```

Filter to PRs where:

- `isDraft` is `false`
- `author.login` is NOT the current authenticated user (`gh api user --jq .login`)

Then, for each remaining PR, check the review decision:

```bash
gh pr view <pr-number> --json reviewDecision
```

**Skip PRs where `reviewDecision` is `APPROVED`** — they already have an approval and do not need another review pass. Note them in the output as "already approved — skipped".

If no PRs remain after filtering, tell the user "No open PRs from other team members need reviewing — nothing to do." and stop.

Print the list so the user can see what will be processed and what was skipped:

```
Found N open PRs to review (M skipped — already approved):
  #123 — @author — branch-name (Title)
  ...

Skipped (already approved):
  #125 — @author — branch-name (Title)
```

Process PRs in order from lowest number to highest.

---

## Loop — For each PR

Run Steps 1–8 for each PR in the list.

---

### Step 1 — Fetch PR metadata

```bash
gh pr view <pr-number> --json number,title,url,headRefName,baseRefName,author,body,commits,files
```

Extract the issue number from the branch name (e.g. `41-something` → `#41`). Note it — it will appear in review comments for traceability.

---

### Step 1b — Check CI status

```bash
gh pr checks <pr-number>
```

Categorise each check:

- **Failing** — conclusion is `FAILURE` or `ERROR`
- **Pending / running** — conclusion is `PENDING`, `IN_PROGRESS`, `QUEUED`, or similar in-flight state
- **Passing** — conclusion is `SUCCESS`, `NEUTRAL`, or `SKIPPED`

**Only note failing checks.** Do not mention pending/running checks at all — they have not finished and there is nothing actionable. Do not mention passing checks either.

Record the list of failing check names (if any) — they will be included in the review comment in Step 7.

---

### Step 2 — Fetch all existing comments and reviews

Fetch everything that has ever been said on this PR:

```bash
# Line-level review comments
gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate

# Top-level issue comments
gh api repos/{owner}/{repo}/issues/{pr}/comments --paginate

# Review objects (approvals, changes-requested, review bodies)
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate
```

Also fetch thread resolution state via GraphQL:

```bash
gh api graphql -f query='
  query {
    repository(owner: "<owner>", name: "<repo>") {
      pullRequest(number: <pr>) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 5) {
              nodes { body author { login } createdAt }
            }
          }
        }
      }
    }
  }'
```

---

### Step 3 — Build the prior-AI-review history

Identify all comments whose body starts with an AI-review heading — any of `## AI Code Review`, `## AI Review`, or `## AI Pre-Review` (regex: `^## AI .*Review`). These are prior AI reviews posted by this command or any other Claude Code review command.

For each such prior finding:

1. **Find the original claim** — the bullet point or finding text.
2. **Determine status**:
   - **Addressed** — the thread is resolved, OR a subsequent commit touched the relevant file/line, OR the author replied confirming the fix.
   - **Pushed back on** — the PR author replied disagreeing, explained the intent, or explicitly rejected the suggestion.
   - **Still open** — raised, not yet discussed or fixed.

Record each prior finding in one of these three buckets. This drives what the new review comment will say.

---

### Step 4 — Fetch the diff

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/files --paginate
```

For each changed file, read the current content. Read the full file if it is small (<400 lines). For larger files, read the diff hunks only (from the `patch` field in the files API response).

---

### Step 5 — Run the code review

Review the diff against the following lenses:

1. **Correctness** — logic bugs, off-by-one errors, incorrect conditions, unhandled edge cases, broken contracts.
2. **TypeScript strictness** — `any` types, missing generics, unsafe casts, missing type guards.
3. **OWASP Top 10** — injection, broken auth, sensitive data exposure, insecure deserialization, etc.
4. **WCAG AA** — missing alt text, unlabelled interactive elements, colour-contrast issues, keyboard traps, missing ARIA roles.
5. **Test coverage** — branches, edge cases, and error paths not covered by existing tests.
6. **Conventions** — violations of `docs/development/engineering-standards.md` and commit/branch naming.
7. **Docs sync** — code changes that contradict or orphan existing documentation.
8. **Performance** — N+1 queries, synchronous blocking, excessive re-renders, missing memoisation where obviously needed.

For each lens, produce zero or more findings. A finding must include:

- File and line number (or "general" if PR-wide)
- Classification: 🔴 must-fix / 🟡 should-fix / 🔵 consider
- One-sentence description of the issue

Only 🔴 findings block approval. 🟡 and 🔵 are informational — include them but still approve unless a 🔴 exists.

---

### Step 6 — Reconcile with prior review history

Before composing the new review comment:

1. **Do NOT re-raise findings that were pushed back on** (from Step 3). The author's position is known. Acknowledge them once in the "Previously discussed" section — do not list them as new findings.
2. **Do NOT re-raise findings that were addressed.** You may note them in an "Addressed since last review" section.
3. **DO re-raise findings that are still open** AND appear again in the new review.
4. **Add all new findings** from Step 5 that were not in any prior AI review.

---

### Step 7 — Post the review comment

Compose the review body using this format:

```
## AI Code Review

Reviewed against: correctness, TypeScript strictness, OWASP, WCAG AA, test coverage, conventions, docs sync, and performance.

**Prior AI review checked** — [N previously raised items: X addressed, Y pushed back on (not re-raised), Z still open.]

### ✅ Addressed since last review
<list items fixed since prior AI review, or omit section if none>

### ❌ Failing CI checks
<list each failing check name — omit this section entirely if no checks are failing or all are still running>

### Findings

<list each finding as: emoji + classification + `file:line` + one-sentence description>

_or_ ✅ No new findings — all lenses clear.

### Previously discussed — not re-raised

<list items raised before and pushed back on, with: "Raised previously — author pushed back, not re-raised.">

_or_ (omit section if none)

### Verdict

<one of: Approving — no 🔴 findings. / Requesting changes — see 🔴 finding(s) above.>
```

Post the comment:

```bash
gh pr comment <pr-number> --body $'<review body>'
```

---

### Step 8 — Submit the formal GitHub review

**This step is mandatory.** The comment above is visible in the conversation but does not record a verdict in GitHub's review system.

Compute the verdict:

- Any 🔴 findings that are new (not previously pushed back on) → `--request-changes`
- No 🔴 findings, or all 🔴s were already pushed back on → `--approve`

```bash
# Approving
gh pr review <pr-number> --approve \
  --body 'No 🔴 findings — approving. See review comment for details.'

# Requesting changes
gh pr review <pr-number> --request-changes \
  --body '🔴 must-fix finding(s) — see review comment above.'
```

---

### Step 9 — PR summary

After finishing each PR, output a compact summary before moving to the next:

```
## PR #<number> — <title> (@author)

🔍 Review: [approved ✅ / changes requested 🔴]
🆕 New findings (N): [list or "none"]
♻️  Re-raised still-open (N): [list or "none"]
✅ Addressed since last review (N): [list or "none"]
🚫 Not re-raised — pushed back on (N): [list or "none"]
```

---

## End of loop

After all PRs have been processed, print a final summary:

```
## Loop complete

Reviewed N PRs from other team members:
  #123 — @author — approved ✅ / changes requested 🔴
  ...

Total new findings: N (🔴 X must-fix, 🟡 Y should-fix, 🔵 Z consider)
```

Then run a final check:

```bash
gh pr list --state open --json number,title,headRefName,author,isDraft --limit 50
```

If any new PRs from other team members appeared since we started, list them and ask the user if they should be reviewed now.

---

## Notes

- **Do not check out or modify any branch.** This command is read-only and review-only. Never commit to, push to, or create branches for other people's PRs.
- **Do not skip the prior-review check.** Even if a PR has no previous AI review, record that explicitly ("no prior AI review found") so the next run knows it is a first review.
- **One review comment per run.** Do not append to a prior AI comment — post a fresh comment each time, which contains the full picture including what was addressed and what is still open.
- **Lead every review comment with the `## AI Code Review` heading.** The prior-review check (Step 3) uses that heading to recognise its own past comments — dropping it breaks re-run detection.
- **Do not re-raise pushed-back findings.** Once an author has disagreed with a suggestion, respect that decision.
- **Skip bot comments.** Do not include findings from github-actions[bot], codecov, dependabot in the prior-review history analysis.
- **Draft PRs are excluded.** Never review a draft PR — the author has signalled it is not ready.
- **Your own PRs are excluded.** Never review a PR you opened — use `/pr-action-review-mine-loop` for that.
