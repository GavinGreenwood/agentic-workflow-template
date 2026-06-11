Review QA feedback on a GitHub issue: classify each point as a genuine bug, intended behaviour, or out of scope — then propose fixes or push-back responses accordingly.

**Issue:** $ARGUMENTS

---

## Step 1 — Fetch the issue and all comments

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,state,url
gh issue view $ARGUMENTS --comments
```

The issue body is the acceptance criteria / spec. Mark comments ending with `_Actioned by Claude Code_` as **Claude-authored**; all others are **human-authored**. Discard Claude-authored comments — only apply the QA feedback heuristics below to human-authored comments.

Filter human-authored comments to those that look like QA feedback. Signs of QA feedback:

- The comment refers to behaviour observed in a deployed environment, screenshots, or specific reproduction steps
- The comment uses QA language: "bug", "expected", "actual", "screenshot", "reproduce", "regression", "UAT", "testing", "issue found", "not working", "incorrect", "should be"

If no comments look like QA feedback, tell the user: "No QA feedback comments found on #$ARGUMENTS. Nothing to review." and stop.

## Step 2 — Download and analyse screenshots

For each QA comment, check whether it embeds or links screenshots (GitHub image URLs in the comment body). Download each one to a temp path with `curl`, then use the `Read` tool to view it visually. Note what the screenshot shows: the page/section, the visible defect or unexpected behaviour, any error messages, and any relevant UI state.

## Step 3 — Extract and number QA points

From the QA comments and screenshots, extract a flat numbered list of distinct issues raised. Each issue should be one clearly scoped observation. If a single comment raises multiple distinct problems, split them into separate numbered points. Do not merge separate observations into one item.

## Step 4 — Classify each QA point

For each numbered QA point, make a classification based on everything read so far:

**GENUINE BUG** — the behaviour is clearly unintended AND:

- The original issue's acceptance criteria imply this should work correctly, OR
- There is no ADR or documented decision that justifies the behaviour, AND
- It is not clearly outside the stated scope of the issue

**INTENDED BEHAVIOUR** — an ADR or documented decision explicitly or implicitly describes why the system behaves this way. Quote the specific ADR and section. Do not classify as intended behaviour without a concrete reference.

**OUT OF SCOPE** — the QA point describes valid functionality, but it was never in the acceptance criteria of this issue (or any linked issue). This is a new request, not a defect. These should be logged as new issues, not fixed here.

**UNCERTAIN** — none of the above applies with confidence. Use this only when the evidence is genuinely ambiguous after reading all available context. Document exactly why you are uncertain — what evidence points each way.

## Step 5 — For GENUINE BUG points: analyse the codebase

For each point classified as GENUINE BUG, find the most likely source of the problem in the codebase:

1. Use grep/glob to locate relevant files — do not guess file paths.
2. Identify the specific file(s) and line(s) where the defect most likely originates.
3. Propose a concrete fix: what to change, in which file, and why that change addresses the root cause.
4. Note any tests that would need to be added or updated.

Be precise. Vague suggestions like "check the component" are not acceptable — name the file, the function, and the change.

## Step 6 — Present findings and ask for decisions

Output a structured report. For each QA point:

---

### [N] — <one-line summary of the issue>

**Source:** Comment by <author>, <date>
**Screenshot:** <filename or "none"> — <one-sentence description of what it shows, if present>

**Classification:** GENUINE BUG | INTENDED BEHAVIOUR | OUT OF SCOPE | UNCERTAIN

**Reasoning:**
<Concise explanation of why you classified it this way. For INTENDED BEHAVIOUR, cite the ADR or doc by name and section. For OUT OF SCOPE, reference what was and was not in the AC. For UNCERTAIN, lay out both sides.>

**Proposed action:**
<For GENUINE BUG: the specific fix — file, function, change, and test impact.>
<For INTENDED BEHAVIOUR: draft push-back reply for the issue comment.>
<For OUT OF SCOPE: suggest creating a follow-up issue. Propose a one-line title for it.>
<For UNCERTAIN: present both options — fix vs push back — with your recommendation.>

---

After presenting all classified points, check if there are any UNCERTAIN items:

- **If UNCERTAIN items exist:** output:

```
## Decision required

For each UNCERTAIN item above, please tell me what to do:
- fix — treat it as a genuine bug and proceed with the proposed fix
- push-back — treat it as intended / out of scope and post the push-back reply
- skip — take no action on this point for now

Reply with: "1: fix, 2: push-back, 3: skip" (or however many items there are).
```

Wait for the user's decisions before proceeding.

- **If no UNCERTAIN items exist:** proceed directly to Step 7.

## Step 7 — Apply fixes for GENUINE BUG and user-accepted items

Compile the final fix list: all GENUINE BUG items plus any UNCERTAIN items the user chose to fix.

If the fix list is empty, skip the edit / verify / commit / push steps entirely and proceed to Step 8.

Otherwise:

1. For each fix in the list:
   - Read the relevant source file(s) before editing.
   - Apply the change.
   - If the fix requires a new or updated test, write it following TDD conventions (see CLAUDE.md).
2. After all fixes are applied, run `scripts/verify.sh` and resolve any failures before continuing.
3. Commit all changes together: `git add <specific files> && git commit -m "fix(#<issue>): address QA feedback"`
4. Push the commit and wait for the push to complete before the comment step.

## Step 8 — Confirm before posting to the issue

Before posting anything, show the user the exact comment that will be posted and ask for explicit approval:

> "Ready to post the following comment to #$ARGUMENTS. Please review and confirm (yes / edit / cancel):"

Only proceed once the user has said "yes".

Structure the comment as follows:

**QA Review Response**

For each QA point, one bullet:

- **Fixed** `[N]` — <one-line description of what was changed>
- **Intended behaviour** `[N]` — <brief explanation> (cite the ADR)
- **Out of scope** `[N]` — <brief explanation + follow-up issue suggestion if applicable>
- **Pushed back** `[N]` (user decision) — <brief explanation>
- **Skipped** `[N]` (user decision) — no action taken

End the comment with:

_Actioned by Claude Code_

Post with `gh issue comment $ARGUMENTS --body-file <temp-file>` and confirm success to the user.

## Step 9 — Update status if all QA points are resolved

If **every** QA point is either Fixed, Intended Behaviour, or Out of Scope (i.e. no open defects remain), ask the user whether to move the issue back to the QA/testing column (label or project status, per the repo's convention).

---

## Notes

- When classifying INTENDED BEHAVIOUR, require an explicit reference. "It probably makes sense" is not sufficient.
- Push-back replies must be respectful and cite the specific ADR, design doc, or acceptance criteria that supports the position.
- If a fix touches multiple files, commit them together in one commit — not separately.
- All issue comments must end with `_Actioned by Claude Code_`.
- Screenshots are evidence, not decoration — describe what they show and use that description as part of your classification reasoning.
