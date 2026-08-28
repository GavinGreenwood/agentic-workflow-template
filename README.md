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

The two roles — `consultant` and `morlock` — are guarded the same way, one step further. Their bodies live in `.agents/skills/<role>/SKILL.md` so all three runtimes share one copy, but they are **role bodies, not skills**: they carry `disable-model-invocation: true` _and_ `user-invocable: false`, plus `allow_implicit_invocation: false` for Codex, and their descriptions begin with `Role adapter only.` so the Copilot coding agent honours the `AGENTS.md` routing rule. Nothing may select or invoke them as a skill. Each role pins a model on all three runtimes, so its model promise holds everywhere rather than falling back to whatever model the session happens to be using.

**Codex needs the role declared, not just present.** A `.codex/agents/<role>.toml` file is inert on its own — Codex only knows a role exists if `.codex/config.toml` declares it:

```toml
[agents.consultant]
config_file = "agents/consultant.toml"
```

Without that block Codex reports no spawnable roles at all, so the model and sandbox guarantees in the role description do not exist on that runtime. `verify:agents` asserts the declaration for every role.

**How hard each guarantee actually is.** A role's `model` binds on Claude Code and Copilot, and **not on Codex**. Measured on Codex 0.148.0: spawning the `consultant` role from a `gpt-5.6-luna` parent wrote `model = gpt-5.6-luna` into _both_ session rollouts — parent and child — rather than the role's pinned `gpt-5.6-sol`, with `fork_turns` omitted and again with `fork_turns: "none"` passed explicitly. Codex's own documentation for a full-history fork says it inherits the parent's model and reasoning effort and "does not accept overrides"; the measurement shows the pin not binding on either path. Copilot is the control: `--agent consultant` reports `gpt-5.6-sol` against a `claude-sonnet-4.6` default, so the pin genuinely binds there. This matters more than a documentation nit, because `verify:agents` asserts a role file _contains_ a model pin — which is not the same as the pin taking effect. On Codex the model promise in a role description is currently instruction-level only, the same status as its `sandbox_mode`. If you need the model bound there, set it on the session (`codex exec -m ...`) rather than trusting the role file. The consultant's _read-only_ property is a hard tool restriction on Claude (`tools: Read, Grep, Glob`) and Copilot (`tools: [read, search]`), and `verify:agents` asserts both lists **exactly**, not merely that they contain no write tool. Two reasons it is an allowlist. A denylist cannot see a capability it has no name for: the Copilot adapter previously granted `playwright/*`, which can click, type, and submit forms, and a check looking for `edit|execute|write` waved it through even though driving a browser is a state change whatever it is called. And the old check read the `tools` line with a same-line regex that scored a missing field, an empty field, and a YAML block list as "no write tools found" — while both runtimes read a missing field as _inherit every tool_. All three shapes passed. The parser and its regression cases in `verify-agent-workflow.mjs` exist because of that, and every shape is now asserted to fail. On Codex it is **instruction-level only, by design**: a spawned agent is deliberately not allowed to disagree with its parent about sandboxing. Codex layers role overrides first and then copies the parent turn's approval policy, cwd, and sandbox onto the child, so a role file's `sandbox_mode` parses cleanly and is then overwritten. This is not a misconfiguration to fix and not something a future key will change. Verified both directions: a `read-only` role wrote outside the repo under a permissive parent, and a `danger-full-access` role was refused under `--sandbox read-only`. If you need that boundary enforced on Codex, set the sandbox on the session (`codex --sandbox read-only`); there is no per-role mechanism. Each role is reached only through its adapter in `.claude/agents/`, `.codex/agents/`, or `.github/agents/`, which is what supplies the model, tool, and sandbox guarantees its description promises — loading the body directly would give an agent the instructions without any of them.

**Why the role is `consultant` and not `advisor`.** Claude Code ships a built-in server-side tool named `advisor` — a stronger reviewer model that receives the full conversation and is invoked by the model itself. With a role also named `advisor`, any instruction to "consult the advisor" resolves to the built-in tool on Claude Code, so the role's pinned model and read-only tool list are silently bypassed and `verify:agents` cannot see it happen. Renaming the role removes the ambiguity and lets both mechanisms run together; `AGENTS.md` § Consulting the `consultant` Role says which to reach for.

The built-in tool is enabled repo-wide in `.claude/settings.json`:

```json
{
  "advisorModel": "opus"
}
```

The [settings reference](https://code.claude.com/docs/en/settings-reference#advisormodel) permits `advisorModel` in any settings file, so committing it here makes it a team default rather than something each developer has to remember to run `/advisor` for. Confirmed on Claude Code 2.1.237: with no key the model reports no `advisor` tool, with the key in `.claude/settings.json` it reports one. Five things to know before adopting the template:

- It is **experimental** and **Anthropic API only** — not Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform, or Microsoft Foundry. On those providers the setting is simply inert.
- It costs extra tokens, and **subagents inherit it**. The advisor re-reads the whole conversation on every call and that read is never cached, so a `consultant` delegation can itself trigger advisor calls billed against its own transcript. There is no setting that caps how often the advisor is called, and no per-role opt-out — `disallowedTools: advisor` does not suppress it.
- It is delivered by a feature flag, so anything that stops flag fetching — `DISABLE_TELEMETRY`, for one — turns it off silently.
- The advisor must be **at least as capable as the main model**. `opus` covers Haiku, Sonnet, and supported Opus mains; a Fable 5 main accepts only `fable`. An unsatisfiable pairing is rejected outright rather than downgraded, so the advisor just does not attach — no fixed value is portable across every possible main model.
- **To opt out, set `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.** `/advisor off` clears only your _user-level_ selection, and a committed project value outranks user settings, so it will not defeat this one.

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
