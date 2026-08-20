# Agentic Workflow Template

A complete, battle-tested workflow for running a software project with **Claude Code, Codex, or GitHub Copilot as the development agent** — agent contract, user-invoked skills, layered guardrail hooks, Playwright MCP, and deterministic quality gates.

Everything in this repo was developed and refined on a real production client project (a Next.js + NestJS monorepo on AWS), where it ran the full delivery loop for months: tickets picked up, features built test-first, PRs raised, reviews actioned, CI fixed, dependencies maintained — with humans steering and machines enforcing quality.

<p align="center">
  <a href="https://youtu.be/oxiBNyUlh7c" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/oxiBNyUlh7c/maxresdefault.jpg" width="640" alt="Watch the walkthrough on YouTube" />
  </a>
  <br />
  <a href="https://youtu.be/oxiBNyUlh7c" target="_blank" rel="noopener noreferrer"><b>▶ Watch the walkthrough</b></a>
</p>

## Import into your repo

Open Claude Code, Codex, or GitHub Copilot in the repo you want to standardise, and paste:

```
Import the agentic workflow standards from
https://github.com/GavinGreenwood/agentic-workflow-template — read its ADOPT.md
and follow it.
```

The agent reads **[ADOPT.md](ADOPT.md)**, which is a playbook, not a copy script. It inspects your repo's actual stack (language, package manager, test runner, CI, tracker, branching model), maps every part of this template to your equivalents (dropping anything that has none), then **asks you the decisions that matter** — how strict the ticket rule is, coverage floor vs ratchet, mandatory vs recommended TDD, which quality layers and skills to bring, who owns CI — with a recommended default for each. Only after you approve the plan does it write anything. The goal is an adoption that fits _your_ repo, in _your_ language, not a TypeScript template pasted on top.

Prefer to drive it yourself? Read [ADOPT.md](ADOPT.md) directly — it doubles as a manual checklist.

## One source of truth

- `AGENTS.md` is the shared agent contract.
- `.agents/skills/` owns every workflow and reusable role.
- `scripts/hooks/` owns the shared hook behaviour.
- `.mcp.json` owns the Playwright MCP command used by Claude Code and GitHub Copilot CLI.
- `.codex/config.toml` points Codex at the same Playwright package.

Provider folders contain only the small adapters their runtimes require:

| Runtime                             | Instructions                    | Skills                                     | Roles             | Hooks                   | Playwright                                        |
| ----------------------------------- | ------------------------------- | ------------------------------------------ | ----------------- | ----------------------- | ------------------------------------------------- |
| Claude Code                         | `CLAUDE.md` imports `AGENTS.md` | `.claude/skills` symlinks `.agents/skills` | `.claude/agents/` | `.claude/settings.json` | `.mcp.json`                                       |
| Codex                               | `AGENTS.md`                     | `.agents/skills/`                          | `.codex/agents/`  | `.codex/hooks.json`     | `.codex/config.toml`                              |
| GitHub Copilot CLI and coding agent | `AGENTS.md`                     | `.agents/skills/`                          | `.github/agents/` | `.github/hooks/`        | `.mcp.json` in CLI, built in for the coding agent |

GitHub Copilot repository files belong in `.github`, not `.copilot`. GitHub.com Copilot Chat is outside this template's target, so there is no `.github/copilot-instructions.md`.

## The philosophy

This workflow is built on the engineering philosophy from two Mark Ridley articles — read these first:

1. [**Augmented Engineering for Grown-Ups**](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/) — the learning loop, planning in git, deterministic quality gates, Swiss cheese defence, end-to-end traceability.
2. [**Implementing Augmented Engineering**](https://mark-ridley.medium.com/implementing-augmented-engineering-d0ab1943082f) (Medium, member-only) — layered hooks (PreToolUse, PostToolUse, pre-commit, pre-push), CI pipeline structure, mutation testing, health checks.

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

And **end-to-end traceability**: every change starts from a ticket, the ticket ID is in the branch name and every commit, the PR links the ticket with test evidence and a rollback plan, and the ticket closes when the PR merges. Machine-enforced, not remembered.

## What's inside

```
ADOPT.md                  Playbook an agent follows to import this into your repo
AGENTS.md                 The agent contract — rules, workflow, golden rules
CLAUDE.md                 Claude Code import stub for AGENTS.md
CONTRIBUTING.md           Branch, commit, and PR conventions
.agents/
  skills/                 Skills (Jira flavour — ticket lifecycle + PR workflow) and reusable agent roles
.claude/
  settings.json           Claude Code hook wiring (PreToolUse / PostToolUse / Stop)
  skills                  Symlink to the canonical .agents/skills directory
  agents/                 Claude Code role adapters
.codex/
  config.toml             Codex Playwright MCP wiring
  hooks.json              Codex hook wiring
  agents/                 Codex role adapters
.mcp.json                 Shared Playwright MCP config for Claude Code and GitHub Copilot CLI
scripts/
  verify.sh               Full verification suite — same checks as CI
  hooks/                  The shared guardrail hook scripts
.husky/                   pre-commit and pre-push quality gates
.github/
  agents/                 GitHub Copilot role adapters
  hooks/                  GitHub Copilot hook wiring
  pull_request_template.md
docs/
  philosophy.md           The engineering philosophy, expanded
  development/            Engineering standards the agent codes against
  adr/                    Architecture Decision Records (immutable)
```

### The skills

| Skill                          | What it does                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `pickup <ticket-id>`           | Assign the ticket, read it fully, brief the work, create the branch, start PROGRESS.md                    |
| `refine <ticket-id>`           | Pre-implementation refinement: clarifying questions, ranked approaches, posted back to the ticket         |
| `briefing <ticket-id>`         | Read-only context build: the ticket, its comment trail, epic chain, and every PR raised against it        |
| `pr`                           | The full ship workflow: verify → commit → push → PR from template → AI self-review against 8 lenses       |
| `push`                         | Verify, commit, push — no PR                                                                              |
| `pr-action-review <pr>`        | Fetch every review comment, triage (auto-fix / discuss / informational), action them, merge when eligible |
| `pr-review-loop`               | Review all teammates' open PRs — respecting prior discussion, never re-raising pushed-back findings       |
| `pr-action-review-mine-loop`   | Action reviews on all of _your_ open PRs, looping until everything is merged or blocked                   |
| `qa-review-action <ticket-id>` | Classify QA feedback: genuine bug / intended behaviour / out of scope — fix or push back accordingly      |
| `morning`                      | Daily routine: main-branch health, nightly CI triage, Dependabot review                                   |
| `nightly-check`                | Triage scheduled CI runs: flake vs regression vs config vs infra                                          |
| `fix-cicd`                     | Read the failing CI logs on this branch, diagnose flake vs real, fix or re-run                            |
| `dependabot-review`            | Merge green minor/patch bumps, diagnose failing ones, escalate majors                                     |
| `capture`                      | Turn the current conversation into a tracked ticket + commit                                              |
| `main`                         | Safely return to main: checks uncommitted/unpushed work before deleting the branch                        |
| `sync`                         | Post-pull sync: missing env vars, install, generate, build                                                |
| `pr-chore`                     | Raise a small no-ticket chore PR from a worktree without touching your feature branch                     |
| `multi-repo`                   | Manage parallel development slots — several clones, isolated ports, one agent each                        |
| `bump-version`                 | Bump main's semver tag by one minor version and push it — a tag-only operation, no code change            |
| `log-time`                     | Log time to Tempo automatically, derived from git activity since your last logged entry                   |

The 20 skills above are manual-only. Claude Code and GitHub Copilot CLI use the shared `disable-model-invocation: true` frontmatter. Codex uses `allow_implicit_invocation: false` in each skill's `agents/openai.yaml`. Their descriptions also say user-invoked only. `assign-epic` and `run` remain available to agents because the workflow calls them automatically.

One asymmetry to know about: `allowed-tools` in a skill's frontmatter is a **Claude Code** field. Four skills use it so their required `Step 0 — Context (required first)` block runs start to finish without a permission prompt. Codex and Copilot CLI have no equivalent in the shared skill file — they apply their own approval model — so on those runtimes a Step 0 block may still pause for approval. The facts it gathers are identical; only the prompting differs. `verify:agents` checks that every command in a Step 0 block is allow-listed, which is Claude-specific enforcement of a provider-neutral requirement.

The three roles — `advisor`, `worker`, `morlock` — are guarded the same way, one step further. Their bodies live in `.agents/skills/<role>/SKILL.md` so all three runtimes share one copy, but they are **role bodies, not skills**: they carry `disable-model-invocation: true` _and_ `user-invocable: false`, plus `allow_implicit_invocation: false` for Codex, and their descriptions begin with `Role adapter only.` so the Copilot coding agent honours the `AGENTS.md` routing rule. Nothing may select or invoke them as a skill. Each role pins a model on all three runtimes, so the "more capable" and "lighter" promises hold everywhere rather than falling back to whatever model the session happens to be using.

**Codex needs the role declared, not just present.** A `.codex/agents/<role>.toml` file is inert on its own — Codex only knows a role exists if `.codex/config.toml` declares it:

```toml
[agents.advisor]
config_file = "agents/advisor.toml"
```

Without that block Codex reports no spawnable roles at all, so the model and sandbox guarantees in the role description do not exist on that runtime. `verify:agents` asserts the declaration for every role.

**How hard each guarantee actually is.** A role's `model` binds on all three runtimes — a spawned Codex advisor runs on `gpt-5.6-sol` per its own session record, and the Claude and Copilot morlock adapters report `claude-opus-5` and `gpt-5.6-sol`. The advisor's _read-only_ property is a hard tool restriction on Claude (`tools: Read, Grep, Glob`) and Copilot (`tools: [read, search, playwright/*]`), and `verify:agents` asserts neither grants a write tool. On Codex it is **instruction-level only**: a role file's `sandbox_mode` is accepted by the parser but does not constrain the spawned agent — the parent session's sandbox governs. Verified both directions: a `read-only` role wrote outside the repo under a permissive parent, and a `danger-full-access` role was refused under `--sandbox read-only`. If you need that boundary enforced on Codex, set the sandbox on the session (`codex --sandbox read-only`); there is no per-role mechanism. Each role is reached only through its adapter in `.claude/agents/`, `.codex/agents/`, or `.github/agents/`, which is what supplies the model, tool, and sandbox guarantees its description promises — loading the body directly would give an agent the instructions without any of them.

Use the runtime's skill interface to invoke a skill:

- Claude Code: `/pickup PROJ-1`
- Codex: `$pickup PROJ-1`
- GitHub Copilot CLI: `/pickup PROJ-1`

These skills use the **Jira REST API** directly (no MCP server required). Ticket lifecycle skills keep the Jira board in sync: `capture` files into **Backlog**, `pickup` moves to **In Progress**, `pr` to **In Review**, and `pr-action-review` to **Done** on merge. Configure via `.env` — see CONTRIBUTING.md § Jira setup.

## Quickstart

1. **Use this template** (GitHub → "Use this template") or copy `.agents/`, `.claude/`, `.codex/`, `.github/agents/`, `.github/hooks/`, `scripts/`, `.husky/`, `.mcp.json`, `AGENTS.md`, and `CLAUDE.md` into your existing repo.
2. **Authenticate the GitHub CLI** — run `gh auth login`. The skills use `gh` for PRs and CI; Jira tickets are handled via the REST API, not the CLI.
3. Edit `AGENTS.md`: fill in your project overview, repo map, and stack-specific rules. Delete what doesn't apply — the contract only works if it's true. Leave `CLAUDE.md` as `@AGENTS.md`.
4. Wire your package scripts: the gates expect `npm run lint`, `typecheck`, `test`, `build` (and optionally `format:check`, `test:integration`). Adjust `scripts/verify.sh` and `.husky/*` to match your stack.
5. **Configure Jira** — copy `.env.example` to `.env` and set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_ACCOUNT_ID`, and `JIRA_PROJECT_KEY`. These are config, not secrets — `.env.example` documents them and your real `.env` stays uncommitted.
6. Confirm the `playwright` MCP server is connected in your chosen runtime.
7. Create a well-written Jira ticket (acceptance criteria included — the agent implements exactly what the ticket says).
8. Open your coding agent and invoke `pickup PROJ-1`: `/pickup PROJ-1` in Claude Code or GitHub Copilot CLI, or `$pickup PROJ-1` in Codex.

## Adapting it

Different tracker, CI, or stack? That's exactly what **[ADOPT.md](ADOPT.md)** handles — it maps every part of this template (the Jira `curl` calls, the `gh run` CI commands, the npm scripts and Prisma migration check) to your equivalents and drops anything with none. Point an agent at it, or work through it yourself as a checklist.

## Licence

MIT — take it, adapt it, ship with it.

Built by [Gavin Greenwood](https://github.com/GavinGreenwood). If you adapt this into your own repo and land a general improvement to the workflow itself, [PRs back to this repo](https://github.com/GavinGreenwood/agentic-workflow-template) are welcome — everyone downstream benefits.
