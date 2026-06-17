# Contributing

## Branching

- Branch from `main`, always.
- Feature/fix branches: `<issue-number>-<short-description>` — e.g. `42-fix-header-contrast`.
- Chore branches (no issue required): `chore/<short-description>` — e.g. `chore/bump-eslint`.
- Never commit directly to `main`, `staging`, or `production` (the pre-commit hook blocks this).

## Commits

- Conventional Commits format, with the issue number:
  - `feat(#42): add institution comparison table`
  - `fix(#107): debounce search input`
  - `chore: bump prettier to 3.x`
- Keep commits small and focused. One logical change per commit.

## Pull Requests

- Run `scripts/verify.sh` before opening any PR. No exceptions.
- Fill the PR template fully: issue link, summary, test evidence, risk, rollback.
- Include `Closes #<issue>` in the PR body so the issue closes on merge.
- Delete `PROGRESS.md` before raising the PR (the `/pr` command does this).
- Stacked PRs: prepend the ⚠️ stacked-PR warning block at the very top of the body, and never squash-merge a stacked chain — use merge commits.

## Project board

Every issue is tracked on the GitHub Project board, and the slash commands keep
its **Status** in sync — board tracking is required, not optional. The board has
four statuses, and tickets move through them in one direction:

| Status          | Meaning                  | Set by                                    |
| --------------- | ------------------------ | ----------------------------------------- |
| **Backlog**     | Filed, not yet started   | `/capture` (and any manually-filed issue) |
| **In progress** | Assigned and being built | `/pickup`                                 |
| **In review**   | PR open, awaiting review | `/pr` (after the PR is raised)            |
| **Done**        | PR merged, issue closed  | `/pr-action-review` (after merge)         |

`/refine` does not move the card — a refined issue stays in **Backlog** until it
is picked up.

Transitions are driven by [`scripts/set-project-status.sh`](scripts/set-project-status.sh)
`<issue-or-pr-number> "<Status>"`, which adds the item to the board if needed and
sets its status by name (no hard-coded IDs). Configure the board once via `.env`:

```bash
GH_PROJECT_OWNER=your-github-login-or-org
GH_PROJECT_NUMBER=<number from the project URL>
GH_PROJECT_OWNER_TYPE=user   # or 'org'
```

The `gh` token needs the read-write `project` scope: `gh auth refresh -s project`.
This is a **one-time, per-developer** grant — `gh` stores the token in your OS
keychain, not in the repo or `.env`, so there is nothing to commit, share, or
rotate. Each developer authenticates as themselves once. For CI that needs to
move cards, use a fine-grained PAT or GitHub App token held as an Actions
secret — never a committed file.

## Architecture Decision Records

- ADRs live in `docs/adr/`, numbered sequentially.
- Accepted ADRs are immutable. To change a decision, write a new ADR and mark the old one `Superseded by ADR-XXXX`.
