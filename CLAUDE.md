# CLAUDE.md — Agent Contract

> This agent contract is informed by the engineering philosophy in [docs/philosophy.md](docs/philosophy.md) — deterministic quality gates, layered hooks, Swiss cheese defence, end-to-end traceability.
>
> The guardrails (tests, standards, CI checks) give us confidence in the output.
> Code review is spot-checking, not line-by-line. If something slips through, we tighten the system.

## Project Overview

This is a Turborepo monorepo template with a **Next.js** frontend (`apps/web`, port 3000) and a **NestJS** backend (`apps/api`, port 3001). Shared configuration is centralised in `packages/` — TypeScript compiler options, ESLint rules, Jest presets, and a stub shared library. The entire stack is TypeScript strict-mode. When adopting this template, rename the `@template` namespace to your own project scope throughout all `package.json` files. Architecture decisions live in `docs/adr/`.

## Repo Map

```
apps/web/              — Next.js 15 (App Router) frontend
apps/api/              — NestJS backend
packages/shared/       — Shared types, validation schemas, utilities
packages/ui/           — Shared React component library (stub)
packages/eslint-config/ — Centralised ESLint rules (base / nextjs / nestjs)
packages/jest-config/  — Centralised Jest presets (base / nestjs / nextjs)
packages/tsconfig/     — Centralised TypeScript configs (base / nestjs / nextjs / react-library)
packages/test-utils/   — Shared test data builders and helpers (stub)
docs/                  — All documentation (plans, ADRs, architecture, runbooks)
scripts/               — Developer and CI scripts
```

## Workflow Loop

```
Proposal -> Plan -> Tickets -> Branch -> Code -> Gates -> Deploy -> Monitor -> Trace back
```

- Work starts from Jira tickets. Every branch references a ticket.
- Claude can pick up tickets from the backlog and execute them (`/pickup PROJ-1`).
- Fast feedback loops (tests, lint, typecheck) catch problems early.
- CI pipeline and repo hooks act as deterministic guardrails.
- Claude should browse, test, and verify the running app as part of the build experience (e.g. via the Playwright MCP server), not just write code blindly.

The Jira board mirrors this loop, and keeping it in sync is **required, not optional**. Tickets move forward through four statuses — **Backlog** (`/capture`) → **In Progress** (`/pickup`) → **In Review** (`/pr`) → **Done** (`/pr-action-review` on merge).

## MCP Servers

`.mcp.json` configures the `playwright` MCP server (`@playwright/mcp`), available in every Claude Code session — used to browse, click through, and screenshot the running app during verification (see the [run skill](.claude/skills/run/SKILL.md)). Add further MCP servers here as the project grows (e.g. a design-source server for Figma/Storybook, a CI-status server).

## Required Context — Read Before Every Task

Before starting any task, read the relevant context files. Do not code from memory or assumptions.

| Area                            | Files to Read                                                       |
| ------------------------------- | ------------------------------------------------------------------- |
| Always                          | `CLAUDE.md`, `CONTRIBUTING.md`                                      |
| Architecture / design decisions | `docs/architecture/`, `docs/adr/`                                   |
| Engineering patterns            | `docs/development/engineering-standards.md`                         |
| Quality / testing               | `docs/development/quality-strategy.md`                              |
| Feature work                    | The Jira ticket — it is the source of truth for acceptance criteria |

If a task spans multiple areas, read all relevant files. When in doubt, read more rather than less.

### ADR reading policy

`docs/architecture/*.md` (once populated) is the current-state layer — read it first, and treat it as the answer for "what's true now." `docs/adr/` is an immutable decision log, not required reading on its own. Only open a specific ADR by name when the architecture docs cite it (e.g. "see ADR-0021") or are silent/ambiguous on something you need the historical "why" for. Do not read the whole `docs/adr/` folder as a matter of course — as the ADR count grows, several will only _partially_ supersede earlier ones (a specific section, not the whole document), and reading the folder wholesale burns tokens walking chains that a one-line current-state fact in `docs/architecture/` would already answer.

This only works if the architecture docs stay in sync: per the Documentation Sync golden rule below, accepting an ADR that changes current-state behaviour (a data flow, a schema, a pattern) requires updating the relevant `docs/architecture/*.md` file in the _same_ PR — not just writing the ADR. An ADR with no corresponding architecture-doc update is a sync failure, not a future to-do.

CI enforces this with `scripts/check-adr-sync.sh`: a diff that touches `docs/adr/*.md` without also touching `docs/architecture/*.md` fails the build (the check no-ops until `docs/architecture/` exists). Some ADRs (tooling/process decisions) genuinely have no current-state doc to update — for those, add `[skip-adr-sync: reason]` to a commit message on the branch to skip the check. The override is reviewable in the commit history alongside the ADR itself, so keep the reason short but specific (e.g. `[skip-adr-sync: CI tooling change, no architecture-doc impact]`).

## Documentation Sync — The Golden Rule

**Documentation is the source of truth. Code follows docs, not the other way around.**

1. **Before coding**: Read the relevant docs. Your implementation must align with what's documented.
2. **If your implementation matches the docs**: Proceed. No action needed.
3. **If you need to deviate from the docs**: STOP. Do not silently diverge. Instead:
   - Flag the deviation explicitly: what the docs say vs. what you think should change and why.
   - Ask whether we should update the docs to reflect the new direction.
   - Default: update the docs first, then implement. The docs lead, code follows.
   - Also flag if the deviation might indicate we're heading in the wrong direction.
4. **After coding**: Check if any docs need updating to reflect what was built. If you added a new pattern, endpoint, data flow, ADR, or changed behaviour — update the relevant docs in the same PR.
5. **New features or significant changes**: Update architecture docs if the system shape changed. Feature context lives in Jira — not in the repo.

This applies to ALL documentation: architecture, ADRs, conventions, engineering standards, quality strategy, and runbooks.

If docs are stale or contradictory, flag it. Don't guess which version is correct — ask.

## Coding Standards

When writing **any** code **always** refer to @docs/development/engineering-standards.md for best practices, patterns, and conventions.

## PROGRESS.md — Session Scratchpad

> **Primary development agent only.** PROGRESS.md is for the agent actively working a feature or fix on this branch. Secondary agents opened for quick, unrelated tasks (Jira lookups, ticket creation, chore commands, one-off queries) must **not** write to PROGRESS.md — they have no relevant progress to log and doing so pollutes the scratchpad and triggers the stop hook unnecessarily.

Maintain a `PROGRESS.md` file in the repo root during development sessions. This is a running log of progress, decisions, open questions, and direction changes.

### During a session

- Append progress after completing each ticket or significant milestone.
- Record decisions made, problems encountered, and questions that arose.
- Note any direction changes or deviations from the plan.

### Between features / at session end

- Read back PROGRESS.md and identify which docs need updating.
- Update the relevant docs (feature docs, architecture, ADRs, etc.).
- Delete PROGRESS.md and start fresh for the next feature.

PROGRESS.md serves three purposes:

1. **Progress tracking** — proxy for progress against the plan.
2. **Knowledge capture** — temporary home for discoveries during implementation.
3. **Recovery point** — if a session is interrupted, the next session picks up where we left off.

> **Do not git-ignore `PROGRESS.md`.** It must be committable to feature branches so the recovery-point use case works across sessions. The pre-push hook and the `/pr` command enforce that it is deleted before any PR is raised — that is sufficient. Git-ignoring it breaks cross-session continuity without adding any real protection.

### Plans

- End with a concise unresolved questions list.

## TDD Workflow (Red-Green-Refactor)

Follow test-driven development where possible:

1. **RED**: Write a failing test first that defines the expected behaviour.
2. **GREEN**: Write the minimum implementation to make the test pass.
3. **REFACTOR**: Clean up the code while all tests stay green.

**Exploratory-first exception**: When proving out an unfamiliar approach, write the production code first to validate it works. Once validated, comment out the production code, write the failing tests (RED), then uncomment incrementally to make them pass (GREEN). This preserves TDD integrity while allowing necessary exploration.

This cycle applies to unit, integration, and E2E tests. When picking up a ticket, start by writing the test that proves the acceptance criteria, then implement.

## Absolute Rules

These are non-negotiable. No exceptions, no workarounds.

1. **Every task needs a Jira ticket.** No work without a ticket. **Exception:** `chore/` branches (dependency bumps, test maintenance, config housekeeping) are exempt — use a `chore/<short-description>` branch name and a `chore:` commit prefix. All `feat/` and `fix/` work still requires a ticket.
2. **Every code change needs a feature branch** — named per CONTRIBUTING.md (`<ticket-id>-<short-description>`, or `chore/<short-description>`).
3. **Merge = Close** — Close the Jira ticket immediately when the PR merges.
4. **Never commit a schema change without a migration file** — Schema and migration travel together, always.
5. **ADRs are immutable** — Never edit the body of an accepted ADR. The only permitted change is updating its status line to `Superseded by ADR-XXXX` and adding the corresponding blockquote pointer. All decision changes require a brand new ADR. See `CONTRIBUTING.md` § Architecture Decision Records.
6. **Never push with `--no-verify`** without explicit user approval.
7. **Never ignore pre-existing errors** — Fix them, don't bypass them.
8. **Never use `any` types** — Strict TypeScript only. Use `unknown` and narrow with type guards if the type is genuinely uncertain.
9. **Always use i18n keys** (if the project is localised) — Never hardcode user-facing strings.
10. **Ticket update safety check** — Before updating any ticket, check its assignee. If it's assigned to someone other than the current user, or is unassigned, STOP and ask before proceeding.

## What Claude MUST Always Do

- **Read context first**: Read all relevant documentation files before starting any task.
- **Keep docs in sync**: Update documentation in the same PR as code changes. Never let docs drift from reality.
- **Flag deviations**: If implementation needs to differ from documented standards, flag it explicitly and discuss before proceeding.
- **Docs before code**: Create or update documentation before coding when work is non-trivial.
- **TDD by default**: Write failing tests first, then implement, then refactor.
- **Small changes**: Keep changes small and focused. Prefer safe refactors.
- **Tests with features**: Every feature or fix includes tests. Never reduce coverage.
- **Strict TypeScript**: No `any` types. Use strict mode, proper generics, and type guards.
- **Run verification**: Run `scripts/verify.sh` before opening a PR.
- **Follow branching rules**: Branch from `main`, name branches with ticket IDs (see CONTRIBUTING.md).
- **Follow commit conventions**: Include the ticket ID in commit messages (see CONTRIBUTING.md).
- **Close tickets on merge**: When a PR merges, close the corresponding Jira ticket immediately.
- **Respect quality gates**: Never bypass lint, typecheck, tests, or CI checks.
- **Test against standards**: Explicitly test against WCAG and OWASP compliance standards.
- **Trace everything**: Include the ticket ID, plan link, and test evidence in PRs.
- **Fill the PR template fully**: ticket, summary, test evidence, risk, rollback.
- **Attribute all external writes**: Any comment, reply, or message posted to an external system (GitHub PR comments, Jira ticket comments, Slack messages, chat messages) must end with `_Actioned by Claude Code_`. Humans must always be able to tell when Claude authored or actioned something.

## What Claude MUST Never Do

- Silently deviate from documented architecture, patterns, or standards without flagging it.
- Implement code that contradicts docs without updating the docs first.
- Use `any` types in TypeScript. Ever.
- Hardcode user-facing strings instead of using i18n keys (in localised projects).
- Commit a schema change without an accompanying migration file.
- Push with `--no-verify` without explicit user approval.
- Ignore or suppress pre-existing errors, warnings, or failing tests.
- Force push to protected branches (`main`, `staging`, `production`).
- Disable or skip lint, tests, typecheck, or any CI gate.
- Commit secrets, API keys, credentials, or `.env` files.
- Hard-code credentials or sensitive values in test or application code — read them from environment variables; the only exception is a mocked secrets provider returning fixture values.
- Bypass pre-commit or pre-push hooks.
- Deploy without passing all quality gates.
- Create PRs without running `scripts/verify.sh`.
- Start work without a ticket (except `chore/` branches).

## PR Review Standards

These rules apply to **all AI-assisted PR reviews** on this repo — regardless of which review command, tool, or workflow a developer uses.

### Always check conversation history first

Before raising any finding, fetch the full PR conversation:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate
gh api repos/{owner}/{repo}/issues/{pr}/comments --paginate
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate
```

Build a map of every issue that has been raised before. For each prior finding, determine whether it was:

- **Pushed back on** — the PR author replied disagreeing, explained why it was intentional, or explicitly rejected the suggestion.
- **Accepted and addressed** — a fix was committed, or the thread was resolved.
- **Still open** — raised but not yet discussed.

**Never re-raise an issue that was pushed back on.** If the author has already reviewed and rejected a suggestion, raising it again is noise. If you believe the pushback was incorrect, note it once in your summary but do not re-list it as a finding.

### Verdict and approval rules

| Situation                                                    | Verdict                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| No must-fix findings detected                                | **Approve**                                                                                             |
| Must-fix findings detected, but all have been pushed back on | **Approve** — note the outstanding items in the summary for the human reviewer, but do not block the PR |
| Must-fix findings detected and none have been discussed      | **Request changes**                                                                                     |
| Must-fix findings that are new AND genuinely blockers        | **Request changes**                                                                                     |

The goal is to avoid blocking PRs on issues the team has already decided to accept. When in doubt, approve and note — do not block.

### Classifying findings

- 🔴 **Must fix** — bugs, security vulnerabilities, accessibility regressions, broken contracts
- 🟡 **Should fix** — quality, coverage, convention gaps
- 🔵 **Consider** — nit, optional improvement

Only 🔴 findings block approval. 🟡 and 🔵 findings are informational — post them, but still approve.

### Review comment format

Post findings as a PR comment using `gh pr comment`:

```
## AI Review

Reviewed against correctness, TypeScript strictness, OWASP, WCAG AA, test coverage, conventions, docs sync, and performance.

**Conversation history checked** — [N previously discussed items were found; X were pushed back on and are not re-listed.]

### Findings

<list each finding with classification emoji, file:line, and one-sentence description>

_or_ ✅ No findings — all lenses clear.

### Previously discussed — not re-raised

<list any issues found in the diff that were previously raised and pushed back on, with a one-line note: "Raised previously by @reviewer — author pushed back, not re-raised.">

_or_ (omit this section if none)

### Verdict

<Approve / Request changes — and why in one sentence>

_Actioned by Claude Code_
```

### After posting the review comment — submit the formal GitHub review

**This step is mandatory.** A `gh pr comment` does not record a verdict in GitHub's review system. Always follow it with:

```bash
gh pr review <pr-number> --approve --body $'<one-line verdict summary>\n\n_Actioned by Claude Code_'
# or
gh pr review <pr-number> --request-changes --body $'<one-line verdict summary>\n\n_Actioned by Claude Code_'
```

The first line of the body should be a single sentence summarising the verdict (e.g. `"No 🔴 findings — approving. One 🟡 noted in the review comment above."` or `"🔴 must-fix: <brief description> — see review comment above."`), followed by a blank line and the standard `_Actioned by Claude Code_` footer. This first line is what shows up in GitHub's review status and counts toward branch protection approval requirements.

## Commands for Validation

```bash
scripts/verify.sh     # Run the full verification suite (same as CI)

npm run lint          # ESLint across all packages
npm run typecheck     # TypeScript compilation check
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run build         # Production build
```

## Quality Standards

- **Unit test coverage**: Must exceed 70%.
- **WCAG**: AA compliance required. Test with axe-core or equivalent.
- **OWASP**: Top 10 vulnerabilities must be checked. Use security scanning in CI.
- **Mutation testing**: Use Stryker (or equivalent) to validate test quality — tests that kill no mutants prove nothing.
- **Design integrity**: UI work must be checked against the design source (e.g. Figma via MCP).

## Observability

- Structured JSON logging from day one.
- trace_id and correlation_id propagated through all API boundaries.
- Error tracking for both frontend and backend.
- Runbooks in `docs/runbooks/` for top incident types.
