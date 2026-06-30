# Agentic Workflow Template

A complete, battle-tested workflow for running a software project with **Claude Code as the primary development agent** — agent contract, slash commands, layered guardrail hooks, and deterministic quality gates.

Everything in this repo was developed and refined on a real production client project (a Next.js + NestJS monorepo on AWS), where it ran the full delivery loop for months: tickets picked up, features built test-first, PRs raised, reviews actioned, CI fixed, dependencies maintained — with humans steering and machines enforcing quality.

## The philosophy

This workflow is built on the engineering philosophy from two Mark Ridley articles — read these first:

1. [**Augmented Engineering for Grown-Ups**](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/) — the learning loop, planning in git, deterministic quality gates, Swiss cheese defence, end-to-end traceability.
2. [**Building Robust Quality Gates for AI-Augmented Development**](https://medium.com/p/d0ab1943082f) — layered hooks (PreToolUse, PostToolUse, pre-commit, pre-push), CI pipeline structure, mutation testing, health checks.

The core idea:

> The guardrails (tests, standards, CI checks) give us confidence in the output.
> Code review is spot-checking, not line-by-line. If something slips through, we tighten the system.

The agent is fast and tireless but fallible. Instead of reviewing every line it writes, you build **layers of deterministic checks** — each imperfect, but together nearly impossible to slip through (the Swiss cheese model):

```
PreToolUse hook      blocks catastrophic commands before they run
PostToolUse hook     auto-formats + lint-fixes every file the agent touches
Stop hook            reminds the agent to sync docs before ending a turn
pre-commit hook      branch protection, lint-staged, secret detection
pre-push hook        format, lint, typecheck, tests, schema/migration parity
verify.sh            the full CI suite, runnable locally before any PR
CI pipeline          the same gates, deterministically, on every push
AI self-review       the agent reviews its own PR against 8 lenses
Human review         spot-checking — the last slice, not the only one
```

And **end-to-end traceability**: every change starts from an issue, the issue number is in the branch name and every commit, the PR links the issue with test evidence and a rollback plan, and the issue closes when the PR merges. Machine-enforced, not remembered.

## What's inside

```
CLAUDE.md                 The agent contract — rules, workflow, golden rules
CONTRIBUTING.md           Branch, commit, and PR conventions
.claude/
  settings.json           Hook wiring (PreToolUse / PostToolUse / Stop)
  commands/               Slash commands (Jira flavour — ticket lifecycle + PR workflow)
  agents/morlock.md       Internal adversarial security agent
scripts/
  verify.sh               Full verification suite — same checks as CI
  hooks/                  The guardrail hook scripts
.husky/                   pre-commit and pre-push quality gates
.github/
  pull_request_template.md
docs/
  philosophy.md           The engineering philosophy, expanded
  development/            Engineering standards the agent codes against
  adr/                    Architecture Decision Records (immutable)
```

### The commands

| Command                       | What it does                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/pickup <issue>`             | Assign the issue, read it fully, brief the work, create the branch, start PROGRESS.md                     |
| `/refine <issue>`             | Pre-implementation refinement: clarifying questions, ranked approaches, posted back to the issue          |
| `/pr`                         | The full ship workflow: verify → commit → push → PR from template → AI self-review against 8 lenses       |
| `/push`                       | Verify, commit, push — no PR                                                                              |
| `/pr-action-review <pr>`      | Fetch every review comment, triage (auto-fix / discuss / informational), action them, merge when eligible |
| `/pr-review-loop`             | Review all teammates' open PRs — respecting prior discussion, never re-raising pushed-back findings       |
| `/pr-action-review-mine-loop` | Action reviews on all of _your_ open PRs, looping until everything is merged or blocked                   |
| `/qa-review-action <issue>`   | Classify QA feedback: genuine bug / intended behaviour / out of scope — fix or push back accordingly      |
| `/morning`                    | Daily routine: main-branch health, nightly CI triage, Dependabot review                                   |
| `/nightly-check`              | Triage scheduled CI runs: flake vs regression vs config vs infra                                          |
| `/fix-cicd`                   | Read the failing CI logs on this branch, diagnose flake vs real, fix or re-run                            |
| `/dependabot-review`          | Merge green minor/patch bumps, diagnose failing ones, escalate majors                                     |
| `/capture`                    | Turn the current conversation into a tracked issue + commit                                               |
| `/main`                       | Safely return to main: checks uncommitted/unpushed work before deleting the branch                        |
| `/sync`                       | Post-pull sync: missing env vars, install, generate, build                                                |
| `/pr-chore`                   | Raise a small no-ticket chore PR from a worktree without touching your feature branch                     |
| `/multi-repo`                 | Manage parallel development slots — several clones, isolated ports, one agent each                        |

These commands use the **Jira REST API** directly (no MCP server required). Ticket lifecycle commands keep the Jira board in sync: `/capture` files into **Backlog**, `/pickup` moves to **In Progress**, `/pr` to **In Review**, and `/pr-action-review` to **Done** on merge. Configure via `.env` — see CONTRIBUTING.md § Jira setup.

## Quickstart

1. **Use this template** (GitHub → "Use this template") or copy `.claude/`, `scripts/`, `.husky/`, `CLAUDE.md` into your existing repo.
2. **Authenticate the GitHub CLI** — run `gh auth login`. The commands use `gh` for PRs and CI; Jira tickets are handled via the REST API, not the CLI.
3. Edit `CLAUDE.md`: fill in your project overview, repo map, and stack-specific rules. Delete what doesn't apply — the contract only works if it's true.
4. Wire your package scripts: the gates expect `npm run lint`, `typecheck`, `test`, `build` (and optionally `format:check`, `test:integration`). Adjust `scripts/verify.sh` and `.husky/*` to match your stack.
5. **Configure Jira** — copy `.env.example` to `.env` and set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_ACCOUNT_ID`, and `JIRA_PROJECT_KEY`. These are config, not secrets — `.env.example` documents them and your real `.env` stays uncommitted.
6. Create a well-written Jira ticket (acceptance criteria included — the agent implements exactly what the ticket says).
7. Open Claude Code and type `/pickup PROJ-1`.

## Adapting it

- **Different tracker?** The commands are markdown instructions, not code — port the `curl` Jira API calls to your tracker's API.
- **Different CI?** `/fix-cicd`, `/nightly-check` and `/morning` use `gh run`; swap for your CI's API (the original project used CircleCI via an MCP server).
- **Different stack?** The hooks and gates are stack-agnostic except for the npm script names and the Prisma migration check in pre-push — replace with your migration tool's paths.

## Licence

MIT — take it, adapt it, ship with it.
