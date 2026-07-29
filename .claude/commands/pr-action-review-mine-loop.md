Review and action all open PRs raised by the current user, looping until every PR is either merged or has nothing left to action.

Usage: `/pr-action-review-mine-loop` — no arguments needed.

## Step 0 — Discover open PRs

```bash
gh pr list --author "@me" --state open --json number,title,headRefName,baseRefName --limit 50
```

If there are no open PRs, tell the user "No open PRs found — nothing to do." and stop.

Print the list of PRs found so the user can see what will be processed:

```
Found N open PRs to action:
  #123 — branch-name (Title)
  ...
```

Then begin the loop. Process each PR in order from lowest number to highest.

Initialise an empty **Jira queue** for this run — a list of `{ pr, ticket, title }` entries for every PR that merges during the loop. Jira transitions are never applied inline; they are all actioned in one batch at the end (see "End of loop").

## Loop — For each PR

Run through Steps 1–7 below for each PR in the list. After finishing all PRs, re-check for any newly opened PRs or PRs that have become actionable (reviews posted after we started) — if any exist, loop again. Stop when a full pass finds nothing new to action on any PR.

---

### Step 1 — Check out the branch

Run `git branch --show-current` to get the current branch.

- If already on the PR branch — no action needed.
- If on `main` or another branch — run `git checkout <headRefName>` automatically. No prompt needed — we already know we own all PRs in the list.

---

### Step 2 — Sync with base branch

**Do not merge the base branch into the PR branch speculatively.** Every merge-and-push recreates the full CI run (including e2e and Docker builds, ~15-20 min), and on a repo with concurrent PRs landing on `main`, re-syncing every pass turns the loop into a treadmill. Only touch git history here if GitHub itself reports a conflict. Merging is the priority — never resync with `main` just to be tidy; only do it when GitHub says you must.

1. Run `gh pr view <pr-number> --json baseRefName,mergeable,mergeStateStatus`.
2. If `mergeable` is `MERGEABLE` (no conflicts) — do nothing here. Leave the branch as pushed and continue to Step 3; eligibility and merge are decided in Step 9 against the commit already on the remote.
3. If `mergeable` is `CONFLICTING` (or `mergeStateStatus` is `DIRTY`) — only then sync locally:
   ```bash
   git fetch origin <baseRefName>
   git merge origin/<baseRefName>
   ```
   - Auto-resolve where safe (formatting, import ordering, lock-file changes).
   - For semantic conflicts, favour the PR branch's intent.
   - If a conflict cannot be safely auto-resolved, show it to the user and wait for instruction before continuing.
   - Once resolved, commit and push:
     ```bash
     git add .
     git commit -m "<ticket-id>: merge <baseRefName> into <headRefName>"
     git push origin <headRefName>
     ```
4. If `mergeable` is `UNKNOWN` — GitHub hasn't computed it yet (common right after a push). Re-check once after a short pause rather than merging speculatively; treat it like `MERGEABLE` once it resolves to that state.

---

### Step 3 — Fetch all comments

- **Review comments** (line-level): `gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate`
- **Issue comments** (top-level): `gh api repos/{owner}/{repo}/issues/{pr}/comments --paginate`
- **Reviews** (resolved state): `gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate`

Also fetch unresolved review thread node IDs via GraphQL (needed for resolving later):

```bash
gh api graphql -f query='
  query {
    repository(owner: "<owner>", name: "<repo>") {
      pullRequest(number: <pr>) {
        reviewThreads(first: 50) {
          nodes { id isResolved comments(first: 1) { nodes { body } } }
        }
      }
    }
  }'
```

Skip:

- Already-resolved threads
- CI/infrastructure bots with no code suggestions (github-actions[bot], codecov, dependabot)
- Pure praise / "LGTM" with no action implied

Do NOT skip AI-reviewer comments (e.g. Copilot) — their suggestions are substantive.

---

### Step 4 — Triage each comment

**AUTO-FIX** — act immediately:

- Clear bug, typo, or naming issue
- Style/formatting aligned with our ESLint/Prettier standards
- Missing test or obvious coverage gap
- Straightforward refactor with no architectural implication
- Security / OWASP concern with an obvious fix

**NEEDS DISCUSSION** — surface to user:

- Architectural or design decision challenge
- Significant change in approach required
- Contradicts documented standards in a non-obvious way
- Tradeoff is genuinely non-obvious
- Requires product/stakeholder input
- Vague enough to misinterpret

**INFORMATIONAL** — reply and resolve immediately (no code change):

- Questions already answered by the code or docs
- Nit / optional suggestions
- Out-of-scope observations

For informational threads: post a brief acknowledgement via `gh api`, then resolve via GraphQL. No user input needed.

---

### Step 5 — Apply AUTO-FIX changes

**Always fix on the existing PR branch — never create a new branch or a new Jira ticket for review fixes, regardless of approval state.** The fix belongs to this PR and goes in this PR.

1. Make all auto-fix code changes.
2. Run `scripts/verify.sh` once after all fixes are applied.
3. If verify fails, fix the failures before continuing.
4. Commit: `<ticket-id>: address PR review comments`
5. Push the branch.
6. Reply to each resolved comment (one sentence, what was done).
7. Resolve each fixed thread via GraphQL:
   ```bash
   gh api graphql -f query='
     mutation {
       resolveReviewThread(input: { threadId: "<thread_node_id>" }) {
         thread { isResolved }
       }
     }'
   ```

Only resolve threads where the fix is committed and pushed.

---

### Step 6 — Present NEEDS DISCUSSION items

For each unresolved comment that needs discussion, output:

---

**[N] @reviewer — <file>:<line> (or "general comment")**

> <exact quote>

**My assessment:** <honest view — agree, disagree, or nuanced>
**Suggested reply if we push back:** "<draft>"
**Suggested reply if we accept:** "<draft + what changes>"

---

After listing all of them: "For each item, tell me: accept / reject / skip."

---

### Step 7 — Handle user decisions

- **Accept**: make the change, reply, commit, push, resolve thread via GraphQL.
- **Reject**: post the pushback reply via `gh api`. Leave thread open.
- **Skip**: no action, thread left open.

After all decisions are actioned, run `scripts/verify.sh` once more and push.

---

### Step 8 — Compute reviewer states

This computation is used by both the merge gate (Step 9) and reviewer re-requests (Step 10), so do it once.

For each reviewer, compute their **effective state**:

- Collect all their reviews, sorted oldest → newest.
- Ignore `COMMENTED` reviews entirely.
- Effective state = most recent non-`COMMENTED` review (`APPROVED`, `CHANGES_REQUESTED`, or `DISMISSED`).
- No non-`COMMENTED` reviews = has not yet reviewed.

**Who counts as a human reviewer:** any reviewer whose login does NOT contain `bot` or `copilot`.

> **AI-assisted reviews count as human approvals.** Some reviewers use AI tooling that generates the review body text (e.g. "auto-approved by…" or "Actioned by…"). If the reviewer login is not a bot account (does not contain `bot` or `copilot`), their `APPROVED` review counts as a valid human approval — regardless of how the review body was authored.

---

### Step 9 — Merge gate: merge if eligible

The team contract is: **AI may merge once a human has approved and CI passes.** Encode that here. After all comments are actioned and the branch is pushed, evaluate eligibility:

```bash
gh pr view <pr-number> --json mergeable,mergeStateStatus,reviewDecision,reviews,statusCheckRollup
gh pr checks <pr-number>
```

A PR is **eligible to merge** when ALL of the following hold:

1. **Mergeable** — `mergeable` is `MERGEABLE` and `mergeStateStatus` is not `DIRTY`/`BLOCKED` (no conflicts, no branch-protection block).
2. **CI green** — every check in `gh pr checks` / `statusCheckRollup` is `SUCCESS` or neutral/skipped. Any `FAILURE`/`PENDING`/`ERROR` → not eligible yet.
3. **GitHub approval** — `reviewDecision` is `APPROVED`.
4. **At least one human approval** — at least one reviewer with effective state `APPROVED` (from Step 8) is a human per the rule above.
5. **Nothing left to action** — no NEEDS-DISCUSSION items are still awaiting the user's decision, and no human reviewer's effective state is `CHANGES_REQUESTED`.

**If eligible** — merge immediately, with no Jira question and no pause:

```bash
gh pr merge <pr-number> --merge --delete-branch
```

Confirm it merged (`gh pr view <pr-number> --json state` → `MERGED`).

Extract the ticket ID from the branch name (e.g. `proj-41-...` → `PROJ-41`). If a ticket ID is found, append `{ pr: <number>, ticket: "PROJ-XX", title: "<pr title>" }` to the **Jira queue** for this run. If no ticket ID can be extracted, note "no ticket" for this PR in the final summary and do not add it to the queue.

Do not fetch the ticket, check its assignee, or ask what should happen to it here — all Jira interaction for merged tickets happens once, in a single batch, after every PR in this run has been through the loop (see "End of loop"). Getting merges over the line takes priority over any per-PR Jira bookkeeping.

Then proceed to Step 11.

**If NOT eligible**, record the reason and do not merge:

- Failing/pending CI → leave open, note which checks are red. Do not re-request reviewers (nothing for them to do yet).
- Mergeable + CI green but no human approval yet → go to Step 10 (re-request reviewers), leave open.
- Conflicts / branch-protection block → note it, leave open.
- Pending discussion items → leave open until the user decides.

Nothing is added to the Jira queue for a PR that didn't merge.

---

### Step 10 — Re-request human reviewers (only when not merged for lack of approval)

Only runs when the PR was CI-green and mergeable but had no human approval yet. Re-request review — but **only from reviewers whose effective state (Step 8) is not `APPROVED`**. Skip Copilot and any login containing `bot` or `copilot` — human reviewers only.

```bash
gh pr edit <pr-number> --add-reviewer <login>
```

---

### Step 11 — Jira: deferred

Jira transitions are never applied per-PR in this loop. If this PR merged, its ticket is already sitting in the Jira queue from Step 9 — nothing more to do here. If it didn't merge, there is nothing to queue. Proceed to Step 12.

---

### Step 12 — Return to main

If this PR's branch was checked out during this iteration, run `/main` now. This switches back to main, pulls latest, and deletes the local branch — housekeeping before moving to the next PR. Do not explain what `/main` does or narrate the steps; just invoke it.

---

### Step 13 — PR summary

After finishing each PR, output a compact summary before moving to the next:

```
## PR #<number> — <title>

🔀 Merge: [merged ✅ / not eligible — <reason>]
✅ Auto-fixed (N): [list]
✅ Accepted (N): [list]
↩️ Pushed back (N): [list]
ℹ️ Informational (N): [list]
⏭️ Skipped (N): [list]
👤 Re-requested: [logins or "none needed"]
📋 Jira: [queued for end-of-loop batch / skipped — no ticket / skipped — PR still open]
```

---

## End of loop

After all PRs have been processed, run a final pass:

```bash
gh pr list --author "@me" --state open --json number,title,headRefName --limit 50
```

- Any PR that is now merged: skip.
- Any PR with new review comments since we processed it: re-process it (go back to Step 3 for that PR).
- If nothing new to action on any PR: the loop is done — move on to the Jira batch below.

### Jira batch — action every queued ticket, one at a time

Once every PR is either merged or has nothing left to action, walk the Jira queue built during the loop, one ticket at a time, in the order PRs were merged:

For each `{ pr, ticket, title }` entry:

1. **Assignee safety check.** Fetch the ticket and check the assignee:

   ```bash
   curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
     "$JIRA_BASE_URL/rest/api/3/issue/<ticket>" | jq -r '{summary: .fields.summary, assignee: (.fields.assignee.displayName // "unassigned")}'
   ```

   If assigned to someone other than the current user, ask: "⚠️ <ticket> is assigned to [name], not you — still proceed?" Do not continue for this ticket until confirmed.

2. **Ask the transition question:** "**<ticket> — '<title>'** merged as PR #<pr>. What should happen to the Jira ticket? 1 = Done · 2 = Ready for Testing · 3 = Leave as-is"

3. **Apply the answer immediately** before moving to the next queued ticket:

   **Option 1 — Done:**

   ```bash
   curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
     "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/transitions" | jq '.transitions[] | select(.name == "Done")'
   curl -s -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"transition": {"id": "<id>"}}' \
     "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/transitions"
   ```

   **Option 2 — Ready for Testing:**

   `$QA_ASSIGNEE_QUERY` must be set in the developer's `.env` (e.g. `QA_ASSIGNEE_QUERY=carol`). Use it to look up the QA assignee's Jira `accountId`:

   ```bash
   curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
     "$JIRA_BASE_URL/rest/api/3/user/search?query=$QA_ASSIGNEE_QUERY" | jq '.[0].accountId'
   curl -s -X PUT -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"accountId": "<qa-assignee-account-id>"}' \
     "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/assignee"
   ```

   **Option 3 — Leave as-is:** no Jira action.

Work through the whole queue before printing the final summary — don't interleave Jira questions with anything else at this point; it's the last thing this command does.

### Final summary

```
## Loop complete

All N PRs processed. Summary:
  #123 — merged (PROJ-41 → Done)
  #124 — eligible but blocked: CI pending / awaiting human approval
  #125 — N discussion items pending user decision
```

## Notes

- Always read relevant files before making a fix — never edit from memory.
- If a fix touches multiple files, make one commit covering all of them.
- Never mark a comment as resolved unless the fix is committed and pushed.
- If the total auto-fixes across all PRs exceed 10 files, pause and summarise before proceeding.
- If `scripts/verify.sh` does not exist in the current repo, skip it and note this in the summary.
