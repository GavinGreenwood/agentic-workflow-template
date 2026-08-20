# Local Setup

## Required Reading

Before picking up your first ticket, read these. They explain the engineering philosophy behind how this project is built and how we work with Claude Code, Codex, and GitHub Copilot.

| Resource                                                                                                                                   | What it covers                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Augmented Engineering for Grown-Ups](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/)                   | Learning loop, planning in git, deterministic quality gates, Swiss cheese defence, end-to-end traceability            |
| [Implementing Augmented Engineering](https://mark-ridley.medium.com/implementing-augmented-engineering-d0ab1943082f) (Medium, member-only) | Layered hooks (PreToolUse, PostToolUse, pre-commit, pre-push), CI pipeline structure, mutation testing, health checks |

## Prerequisites

- Node.js (see `.nvmrc` for version)
- Bash — the hooks in `scripts/hooks/` and the parity check shell out to it. On Windows, Git Bash (bundled with Git for Windows) is sufficient.
- On Windows only: symlink support enabled, so `.claude/skills` materialises as a link. See below.

### Windows: the `.claude/skills` link

`.claude/skills` is committed as a symlink to the canonical `.agents/skills` tree. Git on Windows defaults to `core.symlinks=false`, and in that state checkout writes a **17-byte text file** containing the link target instead of a link. Claude Code then finds **zero skills**, and `npm run verify:agents` fails with `.claude/skills must be a link to .agents/skills`.

Enable symlinks before cloning, or re-materialise the path afterwards:

```bash
# Requires Windows Developer Mode (Settings -> Privacy & security -> For developers)
git config core.symlinks true
rm -f .claude/skills && git checkout -- .claude/skills
```

Verify it took:

```bash
git ls-files -s .claude/skills   # mode must be 120000
npm run verify:agents
```

If Developer Mode is unavailable — some managed devices block it — create a directory junction instead, which needs no elevation:

```cmd
rmdir .claude\skills 2>nul & del .claude\skills 2>nul
mklink /J .claude\skills "%CD%\.agents\skills"
```

Run that from the repository root. `mklink /J` resolves a relative target against the
current directory rather than the link's parent, so a relative `..\.agents\skills`
produces a link that exists but points nowhere — hence the absolute `%CD%` form.

The parity check accepts a junction: it records an absolute target rather than the relative `../.agents/skills`, so the check verifies that the path resolves to the canonical tree rather than string-matching the target. Do not replace the link with a copied directory — the two trees would drift and nothing would catch it.

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
