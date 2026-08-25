# Progress

- Read the required agent, contribution, engineering, quality, and local setup guidance.
- Added Windows Copilot hook regression coverage for workspace-root resolution from a foreign working directory, fail-open behaviour, Git fallback, formatting, and docs-sync detection.
- Updated local setup guidance for worktree root resolution and fail-open behaviour.
- Observed the new tests fail against commit 37aa887's Git-only wrappers with status 128 and `fatal: not a git repository` from the foreign working directory.
- Restored the intended wrappers and passed `npm run verify:agents`.
- Fixed the AgentStop PowerShell helper to give child Git processes the resolved workspace as their working directory; PowerShell's logical `Set-Location` alone does not update `ProcessStartInfo` inheritance.
- Restored dependencies after the first full run reported a missing `turbo` executable; `npm ci` completed with zero vulnerabilities.
- Passed targeted Prettier formatting, `npm run verify:agents`, and the full `scripts/verify.sh` suite.

## Decisions

- Execute the exact PowerShell command strings parsed from `.github/hooks/agentic-workflow.json` so tests cover configuration and scripts together.
- Keep the POSIX `bash` commands unchanged.
- Guarantee foreign-cwd fixtures with a Git probe and remove workspace environment keys case-insensitively before setting each scenario.

## Unresolved questions

- None.
