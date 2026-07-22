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

## Loop — For each PR

Run through Steps 1–7 below for each PR in the list. After finishing all PRs, re-check for any newly opened PRs or PRs that have become actionable (reviews posted after we started) — if any exist, loop again. Stop when a full pass finds nothing new to action on any PR.

---

### Step 1 — Check out the branch

Run `git branch --show-current` to get the current branch.

- If already on the PR branch — no action needed.
- If on `main` or another branch — run `git checkout <headRefName>` automatically. No prompt needed — we already know we own all PRs in the list.

---

### Step 2 — Sync with base branch

1. Run `gh pr view <pr-number> --json baseRefName` to confirm the base branch.
2. Fetch and merge:
   ```bash
   git fetch origin <baseRefName>
   git merge origin/<baseRefName>
   ```
3. If clean — push immediately:
   ```bash
   git push origin <headRefName>
   ```
4. If there are conflicts:
   - Auto-resolve where safe (formatting, import ordering, lock-file changes).
   - For semantic conflicts, favour the PR branch's intent.
   - If a conflict cannot be safely auto-resolved, show it to the user and wait for instruction before continuing.
   - Once resolved, commit and push:
     ```bash
     git add .
     git commit -m "<issue-number>: merge <baseRefName> into <headRefName>"
     git push origin <headRefName>
     ```

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

**Always fix on the existing PR branch — never create a new branch or a new issue for review fixes, regardless of approval state.** The fix belongs to this PR and goes in this PR.

1. Make all auto-fix code changes.
2. Run `scripts/verify.sh` once after all fixes are applied.
3. If verify fails, fix the failures before continuing.
4. Commit: `fix(#<issue>): address PR review comments`
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

1. **Mergeable** — `mergeable` is `MERGEABLE` and `mergeStateStatus` is not `DIRTY`/`BLOCKED`.
2. **CI green** — every check is `SUCCESS` or neutral/skipped. Any `FAILURE`/`PENDING`/`ERROR` → not eligible yet.
3. **GitHub approval** — `reviewDecision` is `APPROVED`.
4. **At least one human approval** — at least one reviewer with effective state `APPROVED` (from Step 8) is a human per the rule above.
5. **Nothing left to action** — no NEEDS-DISCUSSION items are still awaiting the user's decision, and no human reviewer's effective state is `CHANGES_REQUESTED`.

**If eligible → merge it. Do not ask first** — the user has authorised AI-merge under exactly these conditions, and this command exists to close PRs out. Use a merge commit to preserve stacked-PR chains:

```bash
gh pr merge <pr-number> --merge --delete-branch
```

Confirm it merged (`gh pr view <pr-number> --json state` → `MERGED`). The linked issue closes automatically via the `Closes #N` line in the PR body; if it's missing, close the issue manually with a one-line comment.

**If NOT eligible**, record the reason and do not merge:

- Failing/pending CI → leave open, note which checks are red. Do not re-request reviewers (nothing for them to do yet).
- Mergeable + CI green but no human approval yet → go to Step 10 (re-request reviewers), leave open.
- Conflicts / branch-protection block → note it, leave open.
- Pending discussion items → leave open until the user decides.

---

### Step 10 — Re-request human reviewers (only when not merged for lack of approval)

Only runs when the PR was CI-green and mergeable but had no human approval yet. Re-request review — but **only from reviewers whose effective state (Step 8) is not `APPROVED`**. Skip any login containing `bot` or `copilot` — human reviewers only.

```bash
gh pr edit <pr-number> --add-reviewer <login>
```

---

### Step 11 — Return to main

If this PR's branch was checked out during this iteration, run `/main` now. This switches back to main, pulls latest, and deletes the local branch — housekeeping before moving to the next PR.

---

### Step 12 — PR summary

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
```

---

## End of loop

After all PRs have been processed, run a final pass:

```bash
gh pr list --author "@me" --state open --json number,title,headRefName --limit 50
```

- Any PR that is now merged: skip.
- Any PR with new review comments since we processed it: re-process it (go back to Step 3 for that PR).
- If nothing new to action on any PR: stop and print a final summary:

```
## Loop complete

All N PRs processed. Summary:
  #123 — merged
  #124 — eligible but blocked: CI pending / awaiting human approval
  #125 — N discussion items pending user decision
```

## Notes

- Always read relevant files before making a fix — never edit from memory.
- If a fix touches multiple files, make one commit covering all of them.
- Never mark a comment as resolved unless the fix is committed and pushed.
- If the total auto-fixes across all PRs exceed 10 files, pause and summarise before proceeding.
- If `scripts/verify.sh` does not exist in the current repo, skip it and note this in the summary.
