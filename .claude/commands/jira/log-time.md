Log time to Tempo automatically based on git activity since the last logged entry.

## Configuration (root `.env`, personal, gitignored)

- `TEMPO_API_TOKEN` — Tempo API token
- `TEMPO_ISSUE_ID` — numeric Jira issue ID the worklogs are booked against (e.g. a standing "Engineering" ticket)
- `TEMPO_ACCOUNT_ID` — your Atlassian account ID
- `GIT_AUTHOR_NAME` — your git author name, used to filter commits to your own work

## Steps

1. **Check config** — if any of the variables above are not set in `.env`, stop and tell the user to add them.

2. **Find the last Tempo entry** — fetch today's worklogs for this account, find the one with the latest end time (startDateTimeUtc + timeSpentSeconds). That is the start of the current session.

```
GET https://api.tempo.io/4/worklogs?authorAccountId=$TEMPO_ACCOUNT_ID&from=<today>&to=<today>&limit=50
Authorization: Bearer $TEMPO_API_TOKEN
```

Sort results by end time descending, take the most recent. If no entries today, step back one day at a time (up to 7 days), repeating the same query with `from=<date>&to=<date>` until an entry is found. Never query without a date range — the Tempo API does not guarantee sort order without one, which can return stale results from months ago.

If the last entry was more than 10 hours ago (i.e. the cap below would apply), ask the user what time they started today — a cross-day gap almost always means they want to log only today's session, not the full elapsed time since yesterday.

3. **Get all git commits since that end time — authored by you only:**

Subtract 15 minutes from the last entry's end time before using it as the `--after` cutoff. This lookback buffer covers the rounding overshoot from the previous log, so no commits fall through the gap between a rounded-up end time and reality.

```bash
git log --after="<last_entry_end_utc minus 15 minutes>" --author="$GIT_AUTHOR_NAME" --format="%h %s" --all
```

Never include commits from other team members — the log must reflect only work done by the account holder.

4. **Calculate duration** — current UTC time minus the end time of the last entry, rounded **up** to the nearest 15 minutes, converted to seconds (1m→15m, 16m→30m, 31m→45m, 46m→60m, 1h1m→1h15m). **Cap at 10 hours (36000 seconds) maximum.**

5. **Build description** — write a human-friendly summary of the work done:
   - Opening sentence summarising the theme of the session
   - Short bullet list in plain English — group related commits where it makes sense
   - Preserve all ticket number references
   - Include commit hashes as parenthetical references only
   - Do not paste raw commit subject lines verbatim — paraphrase naturally
   - If no commits found, note it was non-coding work (meetings, review, etc.)

6. **Log to Tempo** — POST using node's `JSON.stringify` for the payload (never shell string interpolation). Always use **today's date** for `startDate`, regardless of when the last entry was logged:

```
POST https://api.tempo.io/4/worklogs
{
  issueId: $TEMPO_ISSUE_ID,
  timeSpentSeconds: <duration>,
  billableSeconds: <duration>,
  startDate: <today's date YYYY-MM-DD>,
  startTime: <HH:MM:SS>,
  authorAccountId: "$TEMPO_ACCOUNT_ID",
  description: <summary from step 5>
}
```

7. **Confirm** — output the worklog ID, start time, and duration so the user can verify.

## Notes

- Never ask the user which ticket or how long — derive everything automatically.
- Use only ASCII characters in the description — the Tempo API rejects non-ASCII.
- Always use node https or `node -e` with `JSON.stringify` for the POST body — never curl with shell string interpolation.
- Always `export TEMPO_API_TOKEN` after sourcing `.env` — `source .env` alone does not make the variable visible inside Node.js child processes.
