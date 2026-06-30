Run the full ship workflow: verify, commit, push, and open a PR.

1. Clean up ephemeral session artifacts from the repo root:
   - If `PROGRESS.md` exists, read it back to identify any docs that need updating, then delete it. Stage the deletion with `git rm PROGRESS.md` (or `git add PROGRESS.md` if already deleted). The pre-push hook blocks when `PROGRESS.md` is present, so it must be gone before step 5.
   - Delete any image files sitting untracked in the repo root (screenshots from verification sessions). Run:
     ```bash
     find . -maxdepth 1 -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" \) -delete
     ```
     These are never committed — no staging needed. If no images are present, this is a no-op.
2. Run `scripts/verify.sh` from the repo root — always `cd` to the git root first (`cd $(git rev-parse --show-toplevel)`), then run `bash scripts/verify.sh`. If it fails, fix the issues and re-run. Do not skip.
3. Run `git status` and `git diff` to review all changes.
4. Create a commit following CONTRIBUTING.md conventions (ticket ID in message, conventional commit format).
5. Push the branch to origin with `-u` flag.
6. Create a PR using `gh pr create` following the PR template in `.github/pull_request_template.md`:
   - Keep the title short (under 70 characters).
   - If this branch is stacked on another branch (i.e. the PR base is not `main`), prepend the following block to the very top of the PR body — before any other content — and fill in the parent PR number, ticket ID, and short title:

     ```
     ⚠️ Stacked PR — depends on #<parent-pr-number> (<TICKET-ID>: <short title of parent>). The diff shown is only this PR's changes — you can review and approve now. **Do not merge** until #<parent-pr-number> merges first, then retarget this PR's base to `main` before merging.

     ---
     ```

   - Fill in the ticket link, summary, test evidence, review checklist, and risk/rollback sections.
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
     - **Conventions**: Naming, file structure, import order, i18n keys — alignment with `docs/development/conventions.md`.
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

9. Move the Jira ticket to Review:
   - Extract the ticket ID from the branch name (e.g. `wei-123-...` → `WEI-123`).
   - Source `.env` and fetch available transitions: `GET $JIRA_BASE_URL/rest/api/3/issue/<ticket>/transitions`
   - Find the transition whose `name` matches "Review" (case-insensitive) and apply it:

     ```bash
     source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
       -X POST "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/transitions" \
       -H "Content-Type: application/json" \
       -d '{"transition": {"id": "<transition-id>"}}'
     ```

   - If `JIRA_BASE_URL`, `JIRA_API_TOKEN`, or `JIRA_EMAIL` are not set, skip this step and warn the user.

10. Post a Jira comment if it adds value:

    If any of `JIRA_BASE_URL`, `JIRA_API_TOKEN`, or `JIRA_EMAIL` are not set, skip this step and warn the user.

    Use the ticket ID extracted in Step 9 above (e.g. `PROJ-123`) wherever `<ticket>` appears below.

    Use judgment — post when a comment would genuinely help QA or the team understand what changed and what to verify. Skip when there's nothing meaningful to add beyond the PR title.

    **Post a comment when** the change is a bug fix, a visual/UI fix, a behaviour change, or anything where QA needs context to validate it correctly. Good content to include (pick what's relevant):
    - What the problem was (the symptom)
    - Root cause, if non-obvious
    - How it was fixed
    - What QA should check or what should now look/behave differently
    - The PR link

    **Skip the comment when** it's a pure refactor with no visible change, a chore (deps bump, config, docs), or the PR description already covers everything and there's nothing extra to tell QA.

    When posting, write the body to a temp file with a single-quoted heredoc, then send with `--data-binary @file` (avoids shell mangling of backticks and special characters in the text). Replace `<your comment text here>` with the generated comment text — keep the `\n\n_Actioned by Claude Code_` suffix as-is:

    ```bash
    COMMENT_BODY=$(mktemp)
    cat > "$COMMENT_BODY" <<'JSONEOF'
    {
      "body": {
        "type": "doc",
        "version": 1,
        "content": [{
          "type": "paragraph",
          "content": [{
            "type": "text",
            "text": "<your comment text here>\n\n_Actioned by Claude Code_"
          }]
        }]
      }
    }
    JSONEOF

    RESPONSE_BODY=$(mktemp)
    source .env && HTTP_CODE=$(curl -s -o "$RESPONSE_BODY" -w "%{http_code}" \
      -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
      -X POST "$JIRA_BASE_URL/rest/api/3/issue/<ticket>/comment" \
      -H "Content-Type: application/json" \
      --data-binary @"$COMMENT_BODY")
    rm -f "$COMMENT_BODY" "$RESPONSE_BODY"
    ```

    A `201` means success. On failure (`HTTP_CODE` not 2xx), print the contents of `$RESPONSE_BODY` before removing it to help diagnose the error, then continue — do not block the rest of the workflow.

11. Offer to watch for reviews and auto-run `/pr-action-review`:

    If `--watch` was passed as an argument, skip the question below and proceed automatically as if the user said yes.

    Otherwise, ask the user:

    > "Would you like me to watch for reviews and run `/pr-action-review <number>` automatically once one is posted? I'll check every 2 minutes — keep this terminal open."

    If the user says **yes** (or `--watch` was passed), use `ScheduleWakeup` with `delaySeconds: 120` and a self-contained prompt that checks **both** sources for any review activity:

    **Source 1 — formal reviews** (`/pulls/{pr}/reviews`):

    ```bash
    REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
    gh api "repos/$REPO/pulls/<number>/reviews" --paginate \
      --jq '[.[] | select(.user.type != "Bot") | select(.user.login | ascii_downcase | contains("copilot") | not)] | length'
    ```

    A non-zero count means at least one human has submitted a formal review.

    Also check for Copilot specifically:

    ```bash
    gh api "repos/$REPO/pulls/<number>/reviews" --paginate \
      --jq '[.[] | select(.user.login | ascii_downcase | contains("copilot"))] | length'
    ```

    **Source 2 — issue comments** (`/issues/{pr}/comments`):

    ```bash
    gh api "repos/$REPO/issues/<number>/comments" --paginate \
      --jq '[.[] | select(.user.type != "Bot") | select(.body | contains("Actioned by Claude Code") | not)] | length'
    ```

    A non-zero count means a human has posted a substantive comment that isn't one of Claude's own replies.

    **Decision**:
    - If **either source** shows new review activity: run `/pr-action-review <number>` by invoking the skill `pr-action-review` with args `<number>`. **Do not schedule another wakeup** — this watcher is one-shot per PR. Running `/pr-action-review` re-requests review from all pending reviewers, which would trigger another Copilot review and loop indefinitely if the watcher kept running.
    - If **neither source** shows activity yet: schedule another wakeup in 120 seconds with the same prompt.

If any step fails, stop and explain. Do not force or skip gates.
