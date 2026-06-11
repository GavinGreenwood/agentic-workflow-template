Run the full ship workflow: verify, commit, push, and open a PR.

1. If `PROGRESS.md` exists in the repo root, read it back to identify any docs that need updating, then delete it. Stage the deletion with `git rm PROGRESS.md` (or `git add PROGRESS.md` if already deleted). The pre-push hook blocks when `PROGRESS.md` is present, so it must be gone before step 5.
2. Run `scripts/verify.sh` from the repo root — always `cd` to the git root first (`cd $(git rev-parse --show-toplevel)`), then run `bash scripts/verify.sh`. If it fails, fix the issues and re-run. Do not skip.
3. Run `git status` and `git diff` to review all changes.
4. Create a commit following CONTRIBUTING.md conventions (issue number in message, conventional commit format).
5. Push the branch to origin with `-u` flag.
6. Create a PR using `gh pr create` following the PR template in `.github/pull_request_template.md`:
   - Keep the title short (under 70 characters).
   - Include `Closes #<issue-number>` in the body so the issue closes automatically on merge.
   - If this branch is stacked on another branch (i.e. the PR base is not `main`), prepend the following block to the very top of the PR body — before any other content — and fill in the parent PR number, issue number, and short title:

     ```
     ⚠️ Stacked PR — depends on #<parent-pr-number> (#<issue-number>: <short title of parent>). The diff shown is only this PR's changes — you can review and approve now. **Do not merge** until #<parent-pr-number> merges first, then retarget this PR's base to `main` before merging.

     ---
     ```

   - Fill in the issue link, summary, test evidence, review checklist, and risk/rollback sections.
   - Never raise stacked PRs as drafts — raise them ready for review immediately so the team can review and approve in parallel.

7. Output the PR URL. Then:
   - Open the PR in the browser with `gh pr view <number> --web`.
8. Perform a thorough self-review of the PR diff:
   - Fetch the full diff: `gh pr diff`
   - Read every changed file in full before forming any opinion.
   - Review against each of these lenses — note findings under each:
     - **Correctness**: Logic errors, off-by-ones, edge cases not handled, wrong assumptions.
     - **TypeScript**: Any `any` types, missing generics, unsafe casts, type narrowing gaps.
     - **Security (OWASP)**: Injection, XSS, broken auth, exposed secrets, insecure defaults.
     - **Accessibility (WCAG AA)**: Missing ARIA, keyboard nav gaps, contrast issues, focus management.
     - **Test coverage**: Untested paths, missing edge cases, assertions that don't actually verify behaviour.
     - **Conventions**: Naming, file structure, import order, i18n keys — alignment with the docs in `docs/development/`.
     - **Docs sync**: Do any architecture docs, ADRs, or runbooks need updating to reflect this change?
     - **Performance**: Unnecessary re-renders, N+1 queries, unindexed lookups, large bundle additions.
   - For each finding, classify it as: 🔴 **Must fix** (bug, security, accessibility) | 🟡 **Should fix** (quality, coverage) | 🔵 **Consider** (nit, optional improvement).
   - After reviewing, post a comment on the PR using `gh pr comment` with this structure:

     ```
     ## AI Pre-Review

     Self-review completed against correctness, TypeScript strictness, OWASP, WCAG AA, test coverage, conventions, docs sync, and performance.

     ### Findings

     <list each finding with its classification emoji, file:line reference, and a one-sentence description>

     _or_ ✅ No findings — all lenses clear.

     ### Summary

     <1–2 sentence overall assessment — is this ready for human review, or are there blockers?>

     _Actioned by Claude Code_
     ```

   - If there are 🔴 Must fix findings: fix them before the comment is posted, include them in a follow-up commit, then note them as "Fixed prior to this comment" in the findings list.
   - If there are only 🟡/🔵 findings: post the comment as-is and let the human reviewer decide.

9. Offer to watch for reviews and auto-run `/pr-action-review`:

   If `--watch` was passed as an argument, skip the question below and proceed automatically as if the user said yes.

   Otherwise, ask the user:

   > "Would you like me to watch for reviews and run `/pr-action-review <number>` automatically once one is posted? I'll check every 2 minutes — keep this terminal open."

   If the user says **yes** (or `--watch` was passed), schedule a periodic check (e.g. via `ScheduleWakeup` with `delaySeconds: 120`) with a self-contained prompt that checks **both** sources for any review activity:

   **Source 1 — formal reviews** (`/pulls/{pr}/reviews`):

   ```bash
   gh api repos/{owner}/{repo}/pulls/<number>/reviews --paginate \
     --jq '[.[] | select(.user.type != "Bot") | select(.user.login | ascii_downcase | contains("copilot") | not)] | length'
   ```

   A non-zero count means at least one human has submitted a formal review.

   **Source 2 — issue comments** (`/issues/{pr}/comments`):

   ```bash
   gh api repos/{owner}/{repo}/issues/<number>/comments --paginate \
     --jq '[.[] | select(.user.type != "Bot") | select(.body | contains("Actioned by Claude Code") | not)] | length'
   ```

   A non-zero count means a human has posted a substantive comment that isn't one of Claude's own replies.

   **Decision**:
   - If **either source** shows new review activity: run `/pr-action-review <number>`. **Do not schedule another wakeup** — this watcher is one-shot per PR. Running `/pr-action-review` re-requests review from all pending reviewers, which would trigger another bot review and loop indefinitely if the watcher kept running.
   - If **neither source** shows activity yet: schedule another wakeup in 120 seconds with the same prompt.

If any step fails, stop and explain. Do not force or skip gates.
