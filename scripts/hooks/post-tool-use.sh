#!/usr/bin/env bash
# PostToolUse hook — auto-format and lint-fix after file writes/edits.
# Eliminates formatting noise from diffs and review feedback.
# Runs Prettier and ESLint auto-fix silently — no human time wasted on style.

set -euo pipefail

# Read tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{try{const j=JSON.parse(Buffer.concat(d));process.stdout.write(j.tool_input?.file_path||'')}catch{}})" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Format all supported file types with Prettier
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|md|css|yml|yaml|html)$ ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null || true
fi

# Additionally run ESLint with auto-fix on code files
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  npx eslint --fix "$FILE_PATH" 2>/dev/null || true
fi
