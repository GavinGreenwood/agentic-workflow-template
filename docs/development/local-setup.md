# Local Setup

## Required Reading

Before picking up your first ticket, read these. They explain the engineering philosophy behind how this project is built and how we work with Claude Code, Codex, and GitHub Copilot.

| Resource                                                                                                                                   | What it covers                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Augmented Engineering for Grown-Ups](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/)                   | Learning loop, planning in git, deterministic quality gates, Swiss cheese defence, end-to-end traceability            |
| [Implementing Augmented Engineering](https://mark-ridley.medium.com/implementing-augmented-engineering-d0ab1943082f) (Medium, member-only) | Layered hooks (PreToolUse, PostToolUse, pre-commit, pre-push), CI pipeline structure, mutation testing, health checks |

## Prerequisites

- Node.js (see `.nvmrc` for version)

## Coding Agent Setup

Use Claude Code, Codex, or GitHub Copilot CLI. All three read `AGENTS.md` and the canonical skills in `.agents/skills/` through their repository adapters.

Install the runtime you intend to use from its current vendor documentation. Then confirm its repository configuration:

- Claude Code: `CLAUDE.md` imports `AGENTS.md`, and `.claude/skills` resolves to `.agents/skills`.
- Codex: `.codex/config.toml`, `.codex/hooks.json`, and `.codex/agents/` are detected.
- GitHub Copilot CLI: `.github/hooks/`, `.github/agents/`, and `.agents/skills/` are detected. Do not create a repo `.copilot` folder.

Confirm that the `playwright` MCP server is available before visual work. Claude Code and Copilot CLI use `.mcp.json`; Codex uses `.codex/config.toml`; GitHub Copilot coding agent provides Playwright in its hosted environment.

GitHub Copilot CLI keeps repository hooks and workspace MCP servers off in an untrusted non-interactive `-p` session. Opt into both for that process when the folder has not already been trusted:

```bash
GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true \
GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP=true \
copilot -p "your prompt"
```

### Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

The required variables and how to find them are documented inline in `.env.example`. The key ones for Jira:

| Variable           | Where to get it                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JIRA_API_TOKEN`   | [id.atlassian.com](https://id.atlassian.com) → Security → API tokens                                                                                                       |
| `JIRA_ACCOUNT_ID`  | Run: `curl -u $JIRA_EMAIL:$JIRA_API_TOKEN "$JIRA_BASE_URL/rest/api/3/myself" \| python3 -c "import json,sys; print(json.load(sys.stdin)['accountId'])"`                    |
| `JIRA_PROJECT_KEY` | The letters before the dash on any ticket in your project (e.g. `PROJ` from `PROJ-123`). Or look it up from any ticket via the API — see `.env.example` for the one-liner. |
| `JIRA_BOARD_ID`    | Open the project board in Jira — the ID is in the URL: `/jira/software/projects/<KEY>/boards/<ID>`. Or look it up via the API — see `.env.example` for the one-liner.      |

### Starting a ticket

Invoke the `pickup` skill with `PROJ-42`. Claude Code and GitHub Copilot CLI use `/pickup PROJ-42`; Codex uses `$pickup PROJ-42`.

The agent reads the ticket, creates the branch, implements the work, runs verification, and raises the PR.

> **Important:** Make sure the ticket is complete before pointing the agent at it — acceptance criteria defined, relevant designs linked, scope agreed. The agent implements exactly what the ticket says.

## Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

## Useful Commands

```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps
npm run lint         # Lint all packages
npm run typecheck    # TypeScript check
npm run test         # Run unit tests
scripts/verify.sh    # Full verification suite (same as CI)
```
