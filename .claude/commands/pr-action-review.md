Fetch all review comments on the given PR and action them.

Usage: `/pr-action-review <pr-number> [--watch]` — pass the PR number as the argument (e.g. `101`). Pass `--watch` to skip the poll/auto-merge confirmation and proceed automatically.

## Step 1 — Find the PR and check out the branch

Run `gh pr view <pr-number> --json number,url,headRefName,author` to look up the PR.
If the PR does not exist, tell the user and stop.

**Ownership check — do this before anything else:**

Compare the PR author's login against the authenticated GitHub CLI user. Use `gh pr view <pr-number> --jq .author.login` for the PR author and `gh api user --jq .login` for the current user — both return GitHub logins, ensuring a reliable comparison.

- If the PR author is **not** the current user, stop immediately and ask:

  > "⚠️ PR #<number> was opened by **@<author>**, not you. Actioning this will make commits, push to their branch, and post GitHub comments on their behalf. Are you sure you want to proceed? (yes / no)"

  Wait for an explicit **yes** before continuing. If the user says no, stop.

- If the PR author **is** the current user, continue without prompting.

Once the ownership check passes, check out the branch:

1. Run `git branch --show-current` to get the current branch.
2. If already on the PR branch — no action needed.
3. If on `main` — run `git checkout <headRefName>` automatically.
4. Otherwise — warn the user:
   > "You're currently on `<current-branch>`, not on `main` or the PR branch `<headRefName>`. Switch to `<headRefName>`? (yes / no)"
   > Wait for confirmation before switching. If the user says no, stop.

## Step 2 — Check CI state, sync only if it helps

**Do not merge the base branch in by default.** Syncing the base into the PR branch triggers a fresh CI run and makes you wait — pointless when the branch already merges cleanly and CI is green. A clean, green branch should not be disturbed. Sync **only** when there's a problem that a sync would actually clear (a conflict, or a failure already fixed on the base branch).

1. Fetch the PR's merge and check state:
   ```bash
   gh pr view <pr-number> --json baseRefName,mergeable,mergeStateStatus,statusCheckRollup
   ```
2. Decide based on that state:
   - **Mergeable and no failing checks** — `mergeable` is `MERGEABLE` and no check in `statusCheckRollup` has a state/conclusion of `FAILURE`, `ERROR`, `TIMED_OUT`, or equivalent non-success value → **do not sync.** Leave the branch untouched and go to Step 3.
   - **Conflicts** — `mergeable` is `CONFLICTING` (or `mergeStateStatus` is `DIRTY`) → you must sync to resolve them. Go to item 5 of this step (merge + conflict resolution).
   - **Failing checks** → first diagnose whether the failure is this PR's fault before touching anything (steps 3–4).

3. **Diagnose the failing check — is it related to this PR's changes?**
   - Read the failing job(s) from `statusCheckRollup`. For deeper logs use the CircleCI MCP (scoped to this repo only — see CLAUDE.md).
   - Treat it as **unrelated** when, for example: the same job is green on the latest `<baseRefName>`; the failure is in code this PR never touched (compare against `gh pr diff <pr-number> --name-only`); or it's an infra / dependency / lockfile / audit failure that has since been fixed on `<baseRefName>`.
   - Treat it as **related** when the failure is in code this PR changed, or in a test for behaviour this PR introduced.

4. **Act on the diagnosis:**
   - **Unrelated and already fixed on `<baseRefName>`** → this is exactly the case a sync resolves. Merge the base in to pick up the landed fix, push, and **re-check CI status and fetch updated review comments after the new run** — don't assume it's gone:
     ```bash
     git fetch origin <baseRefName>
     git merge origin/<baseRefName>
     # resolve any conflicts per item 5 of this step, then:
     git push origin <headRefName>
     ```
     **Do not open a new ticket, and do not try to fix an unrelated-already-fixed-on-main failure inside this PR.** The only correct action is to merge the existing fix in. If the failure **persists** after the sync, it was not actually fixed on the base branch (or it is related after all) — treat it as a NEEDS DISCUSSION item (Step 6) rather than guessing.
   - **Unrelated but NOT yet fixed on `<baseRefName>`** (genuinely broken everywhere, or flaky) → a sync won't help, so don't sync. Note it for the user in the summary (Step 7) and carry on with the review.
   - **Related to this PR** → do not paper over it with a sync. Treat it as a review finding: fix it in the auto-fix pass (Step 5 — Apply AUTO-FIX) or surface it to the user (Step 6 — Present NEEDS DISCUSSION items).

5. **Conflict resolution** (applies whenever you do merge, in step 2 or step 4):
   - Attempt to auto-resolve where safe (e.g. formatting-only conflicts, import ordering, lock-file changes).
   - For conflicts requiring semantic judgement, favour the PR branch's intent — this branch is the source of truth for the feature being reviewed.
   - If any conflict cannot be safely auto-resolved, show the raw conflict to the user:
     > "There's a conflict in `<file>` I can't safely resolve automatically. Here's the conflict: `<show conflict markers>`. How would you like to resolve it?"
     > Wait for the user's instruction before continuing.
   - Once all conflicts are resolved, commit and push:
     ```bash
     git add .
     git commit -m "<ticket-id>: merge <baseRefName> into <headRefName>"
     git push origin <headRefName>
     ```

## Step 3 — Fetch all comments

Fetch two types of comments using the `gh` CLI:

- **Review comments** (line-level): `gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate`
- **Issue comments** (general/top-level): `gh api repos/{owner}/{repo}/issues/{pr}/comments --paginate`
- **Review threads** (to check resolved state): `gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate`

Skip any comments that are:

- Already resolved (thread is resolved)
- Posted by a CI/infrastructure bot with no code suggestions (e.g. github-actions[bot], codecov, dependabot)
- Pure praise / "LGTM" with no action implied

Do NOT skip Copilot comments — Copilot's review suggestions are substantive and must be triaged like any human reviewer comment.

## Step 4 — Triage each comment

For every remaining comment, make a judgement call:

**AUTO-FIX** — Act immediately if the comment is:

- A clear bug, typo, or naming issue
- A style/formatting fix that aligns with our standards (ESLint, Prettier, conventions.md)
- A missing test or obvious gap in coverage
- A straightforward refactor with no architectural implication
- A security or OWASP concern that has an obvious fix

**NEEDS DISCUSSION** — Do NOT auto-fix. Surface to the user if the comment:

- Challenges an architectural or design decision
- Requires a significant change in approach
- Contradicts documented standards in a way that needs resolving
- Has merit but you disagree, or the tradeoff is non-obvious
- Requires product/stakeholder input (scope, behaviour, UX)
- Is vague or ambiguous enough that you could misinterpret the intent

**INFORMATIONAL** — Reply and resolve immediately (no code change needed):

- Questions that are already answered by the code or docs
- Suggestions marked as "nit" or "optional"
- Out-of-scope observations

For each informational thread: post a brief acknowledgement reply via `gh api`, then resolve the thread via the GraphQL mutation. Do not wait for user input — these are self-contained and leave nothing open for the reviewer.

## Step 5 — Apply AUTO-FIX changes

For each auto-fix:

1. Make the code change.
2. Run `scripts/verify.sh` after all fixes are applied (not after each one).
3. If verify fails, fix the failures before continuing.
4. Commit with the ticket ID and a message referencing the review (e.g. `WEI-8: address PR review comments`).
5. Push the branch.
6. Reply to each resolved comment via `gh api` POST to mark it addressed. Keep replies concise — one sentence describing what was done. Example: `"Fixed — renamed to \`providerKey\` for consistency."`.
7. Resolve each fixed thread via the GraphQL API:

```bash
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: { threadId: "<thread_node_id>" }) {
      thread { isResolved }
    }
  }'
```

To get thread node IDs, fetch the review threads:

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

Only resolve threads where the fix has been committed and pushed. Never resolve a thread that is still pending or under discussion.

## Step 6 — Present NEEDS DISCUSSION items

For each unresolved comment that needs discussion, output a numbered list in this format:

---

**[N] @reviewer — <file>:<line> (or "general comment")**

> <exact quote of the comment>

**My assessment:** <your honest view — do you agree, disagree, or is it nuanced?>
**Suggested reply if we push back:** "<draft reply>"
**Suggested reply if we accept:** "<draft reply + what the change would be>"

---

After listing all of them, ask the user: "For each item, tell me: accept / reject / skip — and optionally provide the reply message you want posted."

## Step 7 — Handle user decisions

When the user responds with their decisions:

- **Accept**: Make the change, reply to the comment, commit and push, then resolve the thread via GraphQL.
- **Reject**: Post the pushback reply to the comment via `gh api`. Do not resolve the thread — leave it open for the reviewer to close if satisfied.
- **Skip**: Do nothing, no reply posted, thread left open.

After all decisions are actioned, run `scripts/verify.sh` once more, push, output a summary, then re-request review:

```
## Review response summary

✅ Auto-fixed (N comments):
- [list]

✅ Accepted and fixed (N comments):
- [list]

↩️ Pushed back (N comments):
- [list]

ℹ️ Informational — replied and resolved (N comments):
- [list]

⏭️ Skipped (N comments):
- [list]
```

Then re-request review — but **only from reviewers who have not yet approved**:

```bash
# Fetch all reviews for the PR
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate
```

For each reviewer in the **currently requested reviewers** list (`gh pr view --json reviewRequests`), compute their **effective state**:

- Collect all their reviews, sorted oldest → newest.
- Ignore `COMMENTED` reviews entirely — a comment after an approval does not withdraw the approval.
- The effective state is the most recent non-`COMMENTED` review state (`APPROVED`, `CHANGES_REQUESTED`, or `DISMISSED`).
- If a reviewer has no non-`COMMENTED` reviews, they have not yet reviewed.

Re-request only reviewers whose effective state is **not** `APPROVED`. If all requested reviewers are effectively `APPROVED`, skip re-requesting entirely.

## Step 8 — Offer to poll and auto-merge

If `--watch` was passed as an argument, skip Q1 only (the "merge now?" / auto-merge question) and proceed automatically as if the user said yes — but still ask Q2 about the Jira ticket state, as that answer is required to drive the post-merge action.

After the summary, fetch the current PR state:

```bash
gh pr view <pr-number> --json mergeable,mergeStateStatus,statusCheckRollup,reviews
```

**Determine approval state**: a PR is considered approved if at least one **human** reviewer's effective state (computed as above, ignoring `COMMENTED`) is `APPROVED`. Bots (any reviewer whose `user.type` is `Bot`, or whose `login` contains `bot` or `copilot`) do not count toward approval — a human must have approved.

**Determine mergeability**: the PR is mergeable when ALL of:

1. `mergeable` is `MERGEABLE` — no merge conflicts.
2. `mergeStateStatus` is `CLEAN` or `HAS_HOOKS` — not blocked by branch protection or other gates.
3. All status checks have passed — no entry in `statusCheckRollup` with `state: FAILURE`, `conclusion: FAILURE`, `PENDING`, or `IN_PROGRESS`.

### If mergeable AND approved by a human

The PR is ready. Ask the user **two questions before merging**:

**Q1 — Merge now or watch?**

> "All checks passed and the PR is approved. Would you like me to merge now?"

**Q2 — Ticket state after merge:**

> "After merging, what should happen to the Jira ticket?
>
> 1. Move to **Done** (no QA required)
> 2. Move to **Ready for Testing** and assign to Carol (needs QA first)
> 3. Leave ticket as-is (dependency bump, part of a larger epic, etc.)"

Record the user's answer to Q2 — it drives the post-merge Jira action.

If the user says yes to Q1, merge using a merge commit (not squash — squash breaks stacked PR chains where a subsequent PR's base commit must match):

```bash
gh pr merge <pr-number> --merge --delete-branch
```

Then apply the Jira action based on Q2 — see **Post-merge Jira action** below.

### If approved by a human but not yet fully mergeable (CI still running or mergeStateStatus not yet clean)

Do **not** offer to merge — the team requires all status checks to pass before merging. Explain the current state concisely and stop:

> "CI is still running (or branch protection is not yet satisfied) — I'll leave this for you to merge once all checks pass."

If no human has approved yet, say so instead:

> "No human reviewer has approved yet — waiting on approval before merging."

Do not enable GitHub's native auto-merge. The merge is always a human decision once the PR is green.

### Post-merge Jira action

Extract the ticket ID from the branch name (e.g. `wei-41-...` → `WEI-41`).

**If Leave as-is (option 3):** No Jira action. Skip this section entirely.

**If Done (option 1):**

```bash
# Fetch transitions, find "Done" by name, apply it
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/transitions"
# then POST the transition id
```

**If Ready for Testing (option 2):**

```bash
# 1. Fetch transitions, find "Ready for Testing" by name, apply it
# 2. Assign to Carol — look up Carol's accountId first:
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/user/search?query=carol" \
  | # extract accountId for the Carol on this project
# 3. PUT the assignee
curl -s -X PUT -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "<carol-account-id>"}' \
  "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/assignee"
```

### If the PR is not mergeable

Explain why concisely (e.g. "GitHub reports conflicts" or "`mergeStateStatus` is BLOCKED — branch protection requires an approval") and do not offer to merge.

## Notes

- Always read the relevant files before making a fix — never edit from memory.
- If a fix touches multiple files, make one commit covering all of them.
- Never mark a comment as resolved unless the fix is committed and pushed.
- If a discussion comment reveals a docs gap, update the relevant doc in the same commit.
- If the total number of auto-fixes is large (>10 files changed), pause and summarise what you're about to do before proceeding.
- **Always attribute replies**: Every comment or reply posted to GitHub must end with `_Actioned by Claude Code_`. Humans must always be able to tell when Claude authored or actioned something.
