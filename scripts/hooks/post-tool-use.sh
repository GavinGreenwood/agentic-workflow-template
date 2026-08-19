#!/usr/bin/env bash
# PostToolUse hook — auto-format and lint-fix after file writes/edits.
# Eliminates formatting noise from diffs and review feedback.
# Runs Prettier and ESLint auto-fix silently — no human time wasted on style.

set -euo pipefail

# Read tool input from stdin and normalise provider-specific path fields.
INPUT=$(cat)
while IFS= read -r FILE_PATH; do
  [ -z "$FILE_PATH" ] && continue
  [ ! -f "$FILE_PATH" ] && continue

  # Format all supported file types with Prettier
  if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|md|css|yml|yaml|html)$ ]]; then
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
  fi

  # Additionally run ESLint with auto-fix on code files
  if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    npx eslint --fix "$FILE_PATH" 2>/dev/null || true
  fi
done < <(printf '%s' "$INPUT" | node -e '
  const chunks = [];
  process.stdin.on("data", chunk => chunks.push(chunk));
  process.stdin.on("end", () => {
    try {
      const payload = JSON.parse(Buffer.concat(chunks));
      const input = payload.tool_input || payload.toolInput || payload.toolArgs || {};
      const directPath = input.file_path || input.filePath || input.path;
      if (directPath) process.stdout.write(`${directPath}\n`);
      const patch = input.command || input.patch || "";
      for (const match of patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)) {
        process.stdout.write(`${match[1].trim()}\n`);
      }
    } catch {}
  });
' 2>/dev/null || true)
