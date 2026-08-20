# PROGRESS — feature/make-it-agent-agnostic verification session (2026-08-19)

Delete this file before raising the PR (pre-push hook enforces it).

## State

4 files modified, uncommitted, all verification green (`scripts/verify.sh` and `node scripts/verify-agent-workflow.mjs` both pass):

- `scripts/hooks/pre-tool-use.js` — Copilot sends `toolArgs` as a JSON-encoded string; hook now parses it (was a silent no-op for Copilot).
- `scripts/hooks/post-tool-use.sh` — same string-parse fix in its embedded node extractor.
- `.github/hooks/agentic-workflow.json` — rewritten to the documented Copilot schema (`version: 1`, camelCase events, handlers with `bash`/`timeoutSec` directly in event arrays).
- `scripts/verify-agent-workflow.mjs` — per-runtime event names, Copilot handler-shape assertion, string-toolArgs policy test, Copilot-shaped formatter fixture test.

## Live proof (sandbox clone)

- **Codex** (gpt-5.3-codex-spark, v0.148.0): deny, Stop block/continue with marker idempotency, PostToolUse prettier — all green. Needs one-time project trust + hook trust (or `--dangerously-bypass-hook-trust`).
- **Claude** (`-p`, untrusted folder): deny, PostToolUse auto-format, Stop marker — all green.
- **Copilot** (gpt-5.6-luna low, CLI 1.0.81-4): repo-level `.github/hooks/` DO load in `-p` mode with `GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true` (log: "Loading repo hooks in prompt mode", hookCount=16). Live proof: preToolUse denied `npm run db:push` with our message; agentStop emitted the DOCS SYNC block JSON and Copilot injected it and continued. postToolUse proven by fixture + user-level run (no file write occurred in the repo-level run). Without the env var or folder trust, repo hooks stay off — exactly as `docs/development/local-setup.md` documents.

## Notes

- Copilot CLI was updated 1.0.79-9 → 1.0.81-4 during testing.
- Accepted tradeoffs vs Claude-only: no `` !`cmd` `` auto-context, no `$ARGUMENTS` templating (prose instead).
- Pre-existing, unrelated: nanoid <3.3.18 high-severity audit warning (GHSA-2v37-7h3g-55p8); fix on a separate chore branch.
- No docs/ files need updating: `local-setup.md`'s Copilot claims were verified correct; README's `.github/hooks/` description remains accurate.

## Next

Commit the 4 files (fix: ... convention per branch history), delete this file, push, raise PR.
