#!/usr/bin/env bash
# Remind ONCE per source-change-set to sync docs, then stay silent. Uncommitted
# work is the normal state on a feature branch (we commit only when asked), so a
# blocking reminder gated on "dirty tree" loops forever — this gates on whether
# the set of changed SOURCE files is new since the last reminder.

# Source/config changes that could warrant doc updates. Exclude docs/ and
# PROGRESS.md: editing those is the *response* to the reminder, not a new trigger.
# Normalise to the bare set of changed file paths: strip the 3-char porcelain
# status prefix (`XY `), resolve rename lines (`old -> new`) to the new path, and
# sort -u. Hashing the path set rather than raw porcelain output means merely
# staging/unstaging the same files does not re-fire the reminder.
changed=$(git status --porcelain 2>/dev/null \
  | grep -vE '(^.{1,3}(docs/|PROGRESS\.md))' \
  | grep -E '\.(ts|tsx|js|jsx|json|sh|yml|yaml|sql|prisma|html|css)$' \
  | sed -E 's/^.{3}//; s/^.* -> //' \
  | sort -u)

[ -z "$changed" ] && exit 0   # no source changes -> nothing to remind about

# Idempotency marker lives in .git/, per-clone and never committed. If git-dir
# can't be resolved (not a repo / git unavailable), degrade quietly rather than
# writing to a bogus "/.docs-sync-reminded" that can't persist and re-blocks.
git_dir=$(git rev-parse --git-dir 2>/dev/null)
[ -z "$git_dir" ] && exit 0
marker="$git_dir/.docs-sync-reminded"

# Only fire when this exact source set differs from the last reminder.
hash=$(printf '%s' "$changed" | git hash-object --stdin 2>/dev/null)
[ -f "$marker" ] && [ "$(cat "$marker" 2>/dev/null)" = "$hash" ] && exit 0

printf '%s' "$hash" > "$marker"
echo "DOCS SYNC: re-read CLAUDE.md § Documentation Sync before stopping if this turn changed code, added a pattern, modified source or config, or introduced a new behaviour. Update PROGRESS.md and any affected docs/ files in the same change." >&2
exit 2
