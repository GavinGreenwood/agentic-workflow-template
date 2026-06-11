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

## Architecture Decision Records

- ADRs live in `docs/adr/`, numbered sequentially.
- Accepted ADRs are immutable. To change a decision, write a new ADR and mark the old one `Superseded by ADR-XXXX`.
