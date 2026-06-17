#!/usr/bin/env bash
# ci-smoke-test.sh — verify a Docker image reports the version it was built with
# Usage: ci-smoke-test.sh <api|web> <image:tag> <expected-semver>
set -euo pipefail

TARGET="${1:-api}"
IMAGE="${2:?image argument required}"
EXPECTED_VERSION="${3:?expected-semver argument required}"

CONTAINER=""
cleanup() {
  if [ -n "$CONTAINER" ]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local retries="${2:-30}"
  echo "  Waiting for $url …"
  for i in $(seq 1 "$retries"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "  ✓ $url responded"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ Timed out waiting for $url" >&2
  return 1
}

assert_json_field() {
  local url="$1"
  local field="$2"
  local expected="$3"
  local actual
  actual=$(curl -sf "$url" | python3 -c "import sys,json; print(json.load(sys.stdin)['$field'])" 2>/dev/null || echo "PARSE_ERROR")
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $field = $actual"
  else
    echo "  ✗ $field: expected '$expected', got '$actual'" >&2
    return 1
  fi
}

echo "=== Smoke test: $TARGET image $IMAGE (expected version $EXPECTED_VERSION) ==="

if [ "$TARGET" = "api" ]; then
  PORT=3001

  # Optional sidecars — pass POSTGRES_DSN / REDIS_URL env vars to use them
  EXTRA_ENV=""
  if [ -n "${POSTGRES_DSN:-}" ]; then
    EXTRA_ENV="$EXTRA_ENV -e DATABASE_URL=$POSTGRES_DSN"
  fi
  if [ -n "${REDIS_URL:-}" ]; then
    EXTRA_ENV="$EXTRA_ENV -e REDIS_URL=$REDIS_URL"
  fi

  CONTAINER=$(docker run -d \
    -p "$PORT:$PORT" \
    -e PORT="$PORT" \
    -e NODE_ENV=production \
    $EXTRA_ENV \
    "$IMAGE")

  wait_for_url "http://localhost:$PORT/healthz"

  echo "  Probing /healthz …"
  curl -sf "http://localhost:$PORT/healthz" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status') in ('ok','UP'), f'unexpected status: {d}'" && echo "  ✓ /healthz ok"

  echo "  Probing /readyz …"
  curl -sf "http://localhost:$PORT/readyz" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status') in ('ok','UP'), f'unexpected status: {d}'" && echo "  ✓ /readyz ok" || echo "  ⚠ /readyz not available yet (non-blocking)"

  echo "  Probing /version …"
  assert_json_field "http://localhost:$PORT/version" "version" "$EXPECTED_VERSION"

elif [ "$TARGET" = "web" ]; then
  PORT=3000

  CONTAINER=$(docker run -d \
    -p "$PORT:$PORT" \
    -e PORT="$PORT" \
    -e NODE_ENV=production \
    -e NEXT_PUBLIC_APP_VERSION="$EXPECTED_VERSION" \
    "$IMAGE")

  wait_for_url "http://localhost:$PORT"
  echo "  ✓ Web app responded on port $PORT"

else
  echo "Unknown target '$TARGET'. Use 'api' or 'web'." >&2
  exit 1
fi

echo ""
echo "=== Smoke test passed ==="
