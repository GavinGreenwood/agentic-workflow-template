# Contributing

## Branching

- Branch from `main`, always.
- Feature/fix branches: `<ticket-id-lowercase>-<short-description>` — e.g. `proj-42-fix-header-contrast`.
- Chore branches (no ticket required): `chore/<short-description>` — e.g. `chore/bump-eslint`.
- Never commit directly to `main`, `staging`, or `production` (the pre-commit hook blocks this).

## Commits

- Conventional Commits format, with the Jira ticket key:
  - `feat(PROJ-42): add institution comparison table`
  - `fix(PROJ-107): debounce search input`
  - `chore: bump prettier to 3.x`
- Keep commits small and focused. One logical change per commit.

## Pull Requests

- Run `scripts/verify.sh` before opening any PR. No exceptions.
- Fill the PR template fully: ticket link, summary, test evidence, risk, rollback.
- Include the Jira ticket key in the PR body (e.g. `PROJ-42`) so it links on merge.
- Delete `PROGRESS.md` before raising the PR (the `/pr` command does this).
- Stacked PRs: prepend the ⚠️ stacked-PR warning block at the very top of the body, and never squash-merge a stacked chain — use merge commits.

## Jira setup

Every ticket is tracked on the Jira board, and the slash commands keep its
**Status** in sync — board tracking is required, not optional. Tickets move
through four statuses in one direction:

| Status          | Meaning                  | Set by                                     |
| --------------- | ------------------------ | ------------------------------------------ |
| **Backlog**     | Filed, not yet started   | `/capture` (and any manually-filed ticket) |
| **In Progress** | Assigned and being built | `/pickup`                                  |
| **In Review**   | PR open, awaiting review | `/pr` (after the PR is raised)             |
| **Done**        | PR merged, ticket closed | `/pr-action-review` (after merge)          |

`/refine` does not move the card — a refined ticket stays in **Backlog** until it
is picked up.

Transitions are made via the Jira REST API (`/rest/api/3/issue/<KEY>/transitions`)
using transition names (no hard-coded IDs). Configure via `.env`:

```bash
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=<from id.atlassian.com → Security → API tokens>
JIRA_ACCOUNT_ID=<your Atlassian account ID>
JIRA_PROJECT_KEY=PROJ
JIRA_BOARD_ID=<optional — board ID from the agile board URL>
```

The API token is personal and stays in your local `.env` — never committed.
Each developer creates their own at `id.atlassian.com → Security → API tokens`.

## Architecture Decision Records

- ADRs live in `docs/adr/`, numbered sequentially.
- Accepted ADRs are immutable. To change a decision, write a new ADR and mark the old one `Superseded by ADR-XXXX`.
