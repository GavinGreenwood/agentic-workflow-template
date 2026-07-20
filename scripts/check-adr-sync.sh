#!/usr/bin/env bash
set -euo pipefail

# check-adr-sync.sh — fails if docs/adr/*.md changed without a matching
# docs/architecture/*.md update in the same diff. Keeps the "current state"
# docs honest as decisions are made, instead of drifting from the ADR log.
# No-ops until docs/architecture/ exists — adjust once you've populated it.
#
# Skip with a `[skip-adr-sync: reason]` marker in a commit message on the
# branch when an ADR genuinely has no current-state doc to update (e.g. a
# tooling/process decision).
#
# Usage: check-adr-sync.sh [base-ref]   (default: origin/main)

BASE_REF="${1:-origin/main}"

git fetch origin main --depth=50 >/dev/null 2>&1 || true

if [ ! -d docs/architecture ]; then
  echo "docs/architecture/ does not exist yet — skipping ADR sync check."
  exit 0
fi

CHANGED_FILES=$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null || true)

ADR_CHANGED=false
ARCH_CHANGED=false
for file in $CHANGED_FILES; do
  [[ "$file" =~ ^docs/adr/.*\.md$ ]] && ADR_CHANGED=true
  [[ "$file" =~ ^docs/architecture/.*\.md$ ]] && ARCH_CHANGED=true
done

if [ "$ADR_CHANGED" = false ] || [ "$ARCH_CHANGED" = true ]; then
  echo "ADR sync check passed."
  exit 0
fi

if git log "$BASE_REF"..HEAD --format=%B 2>/dev/null | grep -qE '\[skip-adr-sync:.*\]'; then
  echo "ADR sync check skipped — [skip-adr-sync: ...] marker found in commit history."
  exit 0
fi

echo "BLOCKED: docs/adr/*.md changed without a matching docs/architecture/*.md update."
echo "Update the relevant architecture doc in this PR, or add a commit message tag"
echo "'[skip-adr-sync: reason]' if this ADR has no current-state doc to update."
exit 1
