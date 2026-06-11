# Jira variants

These are the Jira-flavoured versions of the ticket lifecycle commands, for teams on Atlassian. They talk to the Jira REST API directly via `curl` — no MCP server required — plus a Tempo variant for time logging.

## Required environment variables (root `.env`)

| Variable           | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `JIRA_BASE_URL`    | e.g. `https://yourorg.atlassian.net`                            |
| `JIRA_EMAIL`       | Atlassian account email                                         |
| `JIRA_API_TOKEN`   | Personal API token (id.atlassian.com → Security → API tokens)   |
| `JIRA_ACCOUNT_ID`  | Your Atlassian account ID (used for assignment + safety checks) |
| `JIRA_PROJECT_KEY` | e.g. `PROJ` — ticket IDs become `PROJ-123`                      |
| `JIRA_BOARD_ID`    | The Agile board ID tickets should land on (optional)            |
| `TEMPO_API_TOKEN`  | Tempo API token (only for `/log-time`)                          |
| `TEMPO_ISSUE_ID`   | Numeric Jira issue ID that Tempo worklogs are booked against    |

To use these instead of the GitHub Issues versions, move them up into `.claude/commands/` (replacing the GitHub variants) or invoke them as `/jira/pickup` etc.
