# Local Setup

## Required Reading

Before picking up your first ticket, read these. They explain the engineering philosophy behind how this project is built and how we work with Claude Code.

| Resource                                                                                                                 | What it covers                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Augmented Engineering for Grown-Ups](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/) | Learning loop, planning in git, deterministic quality gates, Swiss cheese defence, end-to-end traceability            |
| [Building Robust Quality Gates for AI-Augmented Development](https://medium.com/p/d0ab1943082f)                          | Layered hooks (PreToolUse, PostToolUse, pre-commit, pre-push), CI pipeline structure, mutation testing, health checks |

## Prerequisites

- Node.js (see `.nvmrc` for version)

## Claude Code Setup

This repo uses Claude Code as the primary development agent. Install it and configure the Jira integration before picking up tickets.

### Install Claude Code

Follow the installation instructions at [claude.ai/code](https://claude.ai/code).

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

```
/pickup PROJ-42
```

Claude reads the ticket, creates the branch, implements the work, runs verification, and raises the PR.

> **Important:** Make sure the ticket is complete before pointing Claude at it — acceptance criteria defined, relevant designs linked, scope agreed. Claude implements exactly what the ticket says.

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
