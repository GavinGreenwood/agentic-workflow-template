# Capture conversation to Jira + commit

Review the full conversation so far and do the following:

## Step 1 — Verify credentials

Check that `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_ACCOUNT_ID` are set in `.env`. If any are missing, stop and ask the user to add them. Source `.env` before all Jira API calls.

## Step 2 — Determine issue type

- If the conversation is fixing broken/incorrect behaviour → **Bug**
- If the conversation is adding new functionality → **Story**
- Otherwise → **Task**

## Step 3 — Create the Jira ticket

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue" \
  -H "Content-Type: application/json" \
  -d "{
    \"fields\": {
      \"project\": { \"key\": \"$JIRA_PROJECT_KEY\" },
      \"issuetype\": { \"name\": \"<Bug|Story|Task>\" },
      \"summary\": \"<concise summary of what was discussed/fixed>\",
      \"description\": {
        \"type\": \"doc\",
        \"version\": 1,
        \"content\": [{
          \"type\": \"paragraph\",
          \"content\": [{
            \"type\": \"text\",
            \"text\": \"<brief description: what the problem was, what was done, any relevant context>\"
          }]
        }]
      },
      \"assignee\": { \"accountId\": \"$JIRA_ACCOUNT_ID\" }
    }
  }"
```

Capture the ticket key from the response `key` field (e.g. `PROJ-999`).

## Step 4 — Move onto the active board

If `JIRA_BOARD_ID` is set in `.env`, move the ticket onto the active board:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/agile/1.0/board/$JIRA_BOARD_ID/issue" \
  -H "Content-Type: application/json" \
  -d "{\"issues\": [\"<TICKET_KEY>\"]}"
```

## Step 5 — Move ticket to In Progress

First, get available transitions:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_KEY>/transitions"
```

Find the transition whose `name` matches "In Progress" (case-insensitive). Use its `id` to apply it:

```bash
source .env && curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST "$JIRA_BASE_URL/rest/api/3/issue/<TICKET_KEY>/transitions" \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "<transition-id>"}}'
```

## Step 6 — Commit changes (if any)

Check `git status`. If there are modified/untracked files relevant to what was discussed:

- Stage the relevant files
- Commit with the ticket key and a concise message following CONTRIBUTING.md conventions:
  - Format: `<TICKET_KEY>: <type>: <short description>`
  - Types: `fix`, `feat`, `refactor`, `chore`
  - Include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` footer

If there are no changes, skip the commit and confirm the ticket was created.

## Step 7 — Report back

Tell the user:

- The ticket key, summary, and link: `$JIRA_BASE_URL/browse/<TICKET_KEY>`
- Whether a commit was made (and the commit message if so)
