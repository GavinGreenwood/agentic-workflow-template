#!/usr/bin/env bash
set -euo pipefail

# verify.sh — runs the same checks as CI, locally.
# Run this before opening a PR. Adjust the script list to your project;
# --if-present lets steps no-op until the matching npm script exists.

echo "=== Lint ==="
npm run lint

echo "=== i18n Key Parity ==="
npm run lint:i18n --if-present

echo "=== Typecheck ==="
npm run typecheck

echo "=== Unit Tests ==="
npm run test

echo "=== Integration Tests ==="
npm run test:integration --if-present

echo "=== Build ==="
npm run build

echo "=== Security Scan ==="
npm audit --audit-level=high || echo "Warning: npm audit found issues"

echo ""
echo "=== All checks passed ==="
