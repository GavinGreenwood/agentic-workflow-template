#!/usr/bin/env bash
set -euo pipefail

# set-project-status.sh — move an issue/PR card to a Status column on the
# GitHub Project board. Single source of truth for board transitions, called
# by the slash commands (/capture, /pickup, /pr, /pr-action-review).
#
# Usage:
#   scripts/set-project-status.sh <issue-or-pr-number> "<Status>"
#   e.g. scripts/set-project-status.sh 42 "In progress"
#
# Config (env vars, or a root .env — never committed; see .env.example):
#   GH_PROJECT_OWNER       GitHub login that owns the project (user or org)
#   GH_PROJECT_NUMBER      The project number, from .../projects/<N>
#   GH_PROJECT_OWNER_TYPE  "user" (default) or "org"
#
# Status names are resolved by name against the board, so this survives column
# edits and works for any adopter's board without hard-coded IDs.
#
# If the board is not configured, the script warns and exits 0 — the calling
# command still succeeds, board tracking is simply skipped until you set the
# vars. For a repo that requires board tracking, set them in .env.

number="${1:-}"
status="${2:-}"

if [ -z "$number" ] || [ -z "$status" ]; then
  echo "usage: $0 <issue-or-pr-number> \"<Status>\"" >&2
  exit 2
fi

# Load root .env if present (developer-local tooling config).
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ -f "$root/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$root/.env"
  set +a
fi

owner="${GH_PROJECT_OWNER:-}"
project_number="${GH_PROJECT_NUMBER:-}"
owner_type="${GH_PROJECT_OWNER_TYPE:-user}"

if [ -z "$owner" ] || [ -z "$project_number" ]; then
  echo "board tracking skipped: set GH_PROJECT_OWNER and GH_PROJECT_NUMBER (see .env.example) to enable" >&2
  exit 0
fi

if [ "$owner_type" != "user" ] && [ "$owner_type" != "org" ]; then
  echo "error: GH_PROJECT_OWNER_TYPE must be 'user' or 'org' (got '${owner_type}')" >&2
  exit 1
fi
owner_field="user"
[ "$owner_type" = "org" ] && owner_field="organization"

# 1. Resolve the project id, the Status field id, and the option id for the
#    requested status name — in one query.
read_query="query(\$owner:String!, \$number:Int!){
  ${owner_field}(login:\$owner){
    projectV2(number:\$number){
      id
      field(name:\"Status\"){
        ... on ProjectV2SingleSelectField { id options { id name } }
      }
    }
  }
}"

resolved="$(gh api graphql -f owner="$owner" -F number="$project_number" -f query="$read_query" \
  2>/dev/null \
  | jq -r --arg s "$status" ".data.${owner_field}.projectV2 | [.id, .field.id, (.field.options[] | select(.name == \$s) | .id)] | @tsv" \
  || true)"

if [ -z "$resolved" ]; then
  echo "error: could not read project #${project_number} for owner '${owner}' (${owner_type}). Check GH_PROJECT_* config and that the token has the project scope (gh auth refresh -s project)." >&2
  exit 1
fi

IFS=$'\t' read -r project_id field_id option_id <<< "$resolved"

if [ -z "${option_id:-}" ]; then
  available="$(gh api graphql -f owner="$owner" -F number="$project_number" -f query="$read_query" \
    --jq "[.data.${owner_field}.projectV2.field.options[].name] | join(\", \")" 2>/dev/null)"
  echo "error: status '${status}' not found on the board. Available: ${available}" >&2
  exit 1
fi

# 2. Resolve the issue/PR node id (the issues endpoint covers PRs too).
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
content_id="$(gh api "repos/${repo}/issues/${number}" --jq .node_id)"

# 3. Add to the board (idempotent — returns the existing item if already added).
item_id="$(gh api graphql -f projectId="$project_id" -f contentId="$content_id" -f query='
  mutation($projectId:ID!, $contentId:ID!){
    addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}){ item { id } }
  }' --jq '.data.addProjectV2ItemById.item.id')"

# 4. Set the Status field.
gh api graphql -f projectId="$project_id" -f itemId="$item_id" -f fieldId="$field_id" -f optionId="$option_id" -f query='
  mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!){
    updateProjectV2ItemFieldValue(input:{
      projectId:$projectId, itemId:$itemId, fieldId:$fieldId,
      value:{ singleSelectOptionId:$optionId }
    }){ projectV2Item { id } }
  }' >/dev/null

echo "board: #${number} → ${status}"
