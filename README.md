# Agentic Workflow Template

A complete, battle-tested workflow for running a software project with Claude Code, Codex, or GitHub Copilot as the coding agent. It provides one shared contract, one skill source, layered guardrail hooks, Playwright MCP, and deterministic quality gates.

Everything in this repo was refined on a production Next.js and NestJS monorepo. It ran the full delivery loop for months: tickets picked up, features built test-first, pull requests raised, reviews actioned, CI fixed, and dependencies maintained, with humans steering and machines enforcing quality.

<p align="center">
  <a href="https://youtu.be/oxiBNyUlh7c" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/oxiBNyUlh7c/maxresdefault.jpg" width="640" alt="Watch the walkthrough on YouTube" />
  </a>
  <br />
  <a href="https://youtu.be/oxiBNyUlh7c" target="_blank" rel="noopener noreferrer"><b>▶ Watch the walkthrough</b></a>
</p>

## Import into your repo

Open your coding agent in the repo you want to standardise, and paste:

```text
Import the agentic workflow standards from
https://github.com/GavinGreenwood/agentic-workflow-template, read its ADOPT.md
and follow it.
```

The agent reads [ADOPT.md](ADOPT.md), inspects the target repo, maps the workflow to its real stack, asks only the decisions that matter, and waits for the plan to be accepted before changing files.

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

The workflow follows two Mark Ridley articles:

1. [Augmented Engineering for Grown-Ups](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/)
2. [Implementing Augmented Engineering](https://mark-ridley.medium.com/implementing-augmented-engineering-d0ab1943082f)

The core idea is simple:

> The guardrails, tests, standards, and CI checks give us confidence in the output. Code review is spot-checking. When something slips through, improve the system that should have caught it.

The layers are:

```text
PreToolUse hook      blocks dangerous actions before they run
PostToolUse hook     formats and lint-fixes files the agent touches
Stop hook            reminds the agent to sync docs
pre-commit hook      checks branches, staged files, and secrets
pre-push hook        runs the local quality gates
verify.sh            runs the full CI-equivalent suite
CI pipeline          repeats deterministic gates on every push
AI self-review       checks the pull request against eight lenses
Human review         spot-checks the result
```

Every change starts from a ticket. The ticket ID appears in the branch and commits, the pull request links the ticket and includes proof, and the ticket closes when the pull request merges.

## What's inside

```text
ADOPT.md                  Adoption playbook
AGENTS.md                 Canonical agent contract
CLAUDE.md                 One-line Claude import stub
CONTRIBUTING.md           Branch, commit, and pull request conventions
.agents/skills/           Canonical workflows and roles
.claude/                  Claude adapters
.codex/                   Codex adapters
.github/agents/           GitHub Copilot role adapters
.github/hooks/            GitHub Copilot hook adapter
.mcp.json                 Shared Playwright MCP config
scripts/verify.sh         Full verification suite
scripts/hooks/            Shared guardrail implementation
.husky/                   Git hooks
docs/                     Philosophy, standards, architecture, and ADRs
```

## User-invoked workflows

| Workflow                       | What it does                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `pickup <ticket-id>`           | Assign, read, brief, branch, and start `PROGRESS.md`                          |
| `refine <ticket-id>`           | Resolve questions and compare approaches before implementation                |
| `briefing <ticket-id>`         | Build read-only ticket, epic, comment, and pull request context               |
| `pr`                           | Verify, commit, push, open a pull request, and self-review                    |
| `push`                         | Verify, commit, and push without opening a pull request                       |
| `pr-action-review <pr>`        | Triage and action every review, then merge when eligible                      |
| `pr-review-loop`               | Review teammates' open pull requests                                          |
| `pr-action-review-mine-loop`   | Action reviews across your open pull requests until each is merged or blocked |
| `qa-review-action <ticket-id>` | Classify QA feedback, fix real bugs, and respond to the rest                  |
| `morning`                      | Check main, nightly CI, and Dependabot                                        |
| `nightly-check`                | Triage scheduled CI runs                                                      |
| `fix-cicd`                     | Diagnose and fix failing CI on the current branch                             |
| `dependabot-review`            | Merge safe updates and diagnose or escalate the rest                          |
| `capture`                      | Turn the current conversation into a ticket and commit                        |
| `main`                         | Return safely to an up-to-date main branch                                    |
| `sync`                         | Check environment keys, install dependencies, and build                       |
| `pr-chore`                     | Raise a no-ticket chore pull request in a separate worktree                   |
| `multi-repo`                   | Manage isolated clones for parallel work                                      |
| `bump-version`                 | Bump and push main's minor version tag                                        |
| `log-time`                     | Record unlogged Git work in Tempo                                             |

The 20 workflows above are manual-only. Claude Code and GitHub Copilot CLI use the shared `disable-model-invocation: true` frontmatter. Codex uses `allow_implicit_invocation: false` in each workflow's `agents/openai.yaml`. Their descriptions also say user-invoked only. `assign-epic` and `run` remain available to agents because the workflow calls them automatically.

Use the runtime's skill interface to invoke a workflow:

- Claude Code: `/pickup PROJ-1`
- Codex: `$pickup PROJ-1`
- GitHub Copilot CLI: `/pickup PROJ-1`

The Jira workflows use the Jira REST API directly. Configure them through `.env`; see the Jira setup in [CONTRIBUTING.md](CONTRIBUTING.md).

## Quickstart

1. Use this GitHub template, or follow [ADOPT.md](ADOPT.md) to fit it to an existing repo.
2. Run `gh auth login`.
3. Edit `AGENTS.md` for the real project. Leave `CLAUDE.md` as `@AGENTS.md`.
4. Adjust `scripts/verify.sh` and `.husky/*` to match the stack.
5. Copy `.env.example` to `.env` and set the Jira values if you use Jira.
6. Confirm the `playwright` MCP server is connected in the chosen runtime.
7. Create a ticket and invoke `pickup`.

Different tracker, CI provider, or stack? [ADOPT.md](ADOPT.md) maps the intent to the target repo and drops anything that has no real equivalent.

## Licence

MIT. Take it, adapt it, and ship with it.

Built by [Gavin Greenwood](https://github.com/GavinGreenwood). General improvements are welcome as [pull requests](https://github.com/GavinGreenwood/agentic-workflow-template).
