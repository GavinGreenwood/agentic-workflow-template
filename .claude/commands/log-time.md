Log time to Tempo automatically based on git activity since the last logged entry.

## Configuration (from `.env`)

| Variable           | Required | Purpose                                                                                                                         |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `TEMPO_API_TOKEN`  | yes      | Tempo API bearer token. Secret.                                                                                                 |
| `TEMPO_ISSUE_ID`   | yes      | **Numeric** Jira/Tempo issue ID to log against (not the key — the internal id field). See `.env.example` for how to look it up. |
| `TEMPO_ACCOUNT_ID` | yes      | Your Atlassian account ID — same value as `JIRA_ACCOUNT_ID`.                                                                    |
| `GIT_AUTHOR_NAME`  | yes      | Your git author name as it appears in commits (run: `git log -1 --format='%an'`).                                               |

If any of these are unset, stop and tell the user which one(s) to add to `.env`.

## Steps

1. **Load & check config** — source `.env` and `export` the variables (a bare `source .env` does not expose them to Node child processes). If `TEMPO_API_TOKEN`, `TEMPO_ISSUE_ID`, `TEMPO_ACCOUNT_ID`, or `GIT_AUTHOR_NAME` is not set, stop and tell the user to add it to `.env`.

2. **Find the last Tempo entry** — fetch today's worklogs for this account, find the one with the latest end time (startDateTimeUtc + timeSpentSeconds). That is the start of the current session.

```
GET https://api.tempo.io/4/worklogs?authorAccountId=<TEMPO_ACCOUNT_ID>&from=<today>&to=<today>&limit=50
Authorization: Bearer $TEMPO_API_TOKEN
```

Sort results by end time descending, take the most recent. If no entries today, step back one day at a time (yesterday, the day before, etc.) up to 7 days, repeating the same query with `from=<date>&to=<date>` until an entry is found. Never query without a date range — the Tempo API does not guarantee sort order without one, which can return stale results from months ago.

Once the last entry end time is found: if it was more than 10 hours ago (i.e. the cap in step 4 would apply), fall back to the machine's boot/unlock time as the session start instead — a generic proxy for "when did today's session start" that needs no per-machine configuration. Detect the OS and run the matching command:

- **Linux:** `uptime -s` — prints boot time directly as `YYYY-MM-DD HH:MM:SS`.
- **macOS:** `date -r "$(sysctl -n kern.boottime | sed -E 's/.*sec = ([0-9]+).*/\1/')"` — extracts the boot epoch from `kern.boottime` and converts it to local time.
- **Windows:** `powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('yyyy-MM-dd HH:mm:ss')"`.

Try `uname` first to pick the Linux/macOS branch; if it's unavailable, assume Windows. If the matching command fails or returns nothing, fall back to asking the user what time they started. A cross-day gap almost always means the user wants to log only today's session, not the full elapsed time since yesterday.

3. **Get all git commits since that end time — authored by you only:**

Subtract 15 minutes from the last entry's end time before using it as the `--after` cutoff. This creates a lookback buffer that covers the maximum possible rounding overshoot from the previous log, ensuring no commits fall through the gap between a rounded-up end time and reality.

```bash
git log --after="<last_entry_end_utc minus 15 minutes>" --author="$GIT_AUTHOR_NAME" --format="%h %s" --all
```

Only include commits where the git author matches `$GIT_AUTHOR_NAME`. Never include commits from other team members — the log must reflect only work done by the account holder.

4. **Calculate duration** — current UTC time minus the end time of the last entry, rounded **up** to the nearest 15 minutes, converted to seconds. For example: 1m→15m, 16m→30m, 31m→45m, 46m→60m, 1h1m→1h15m. **Cap at 10 hours (36000 seconds) maximum** — if the calculated duration exceeds 10 hours, use 36000 seconds instead.

5. **Build description** — write a human-friendly summary of the work done:
   - Opening sentence summarising the theme of the session
   - Short bullet list in plain English — group related commits where it makes sense
   - Preserve all ticket number references (e.g. PROJ-42, PROJ-107)
   - Include commit hashes as parenthetical references only
   - Do not paste raw commit subject lines verbatim — paraphrase naturally
   - If no commits found, note it was non-coding work (meetings, review, etc.)

6. **Log to Tempo** — POST using node's `JSON.stringify` for the payload (never string interpolation). Always use **today's date** for `startDate`, regardless of when the last entry was logged. `issueId` must be numeric — pass `Number(process.env.TEMPO_ISSUE_ID)`:

```
POST https://api.tempo.io/4/worklogs
{
  issueId: Number(TEMPO_ISSUE_ID),
  timeSpentSeconds: <duration>,
  billableSeconds: <duration>,
  startDate: <today's date YYYY-MM-DD>,
  startTime: <HH:MM:SS>,
  authorAccountId: <TEMPO_ACCOUNT_ID>,
  description: <summary from step 5>
}
```

7. **Confirm** — output the worklog ID, the resolved issue id/key, start time, and duration so the user can verify.

## Notes

- Never ask the user which ticket or how long — derive the ticket from `TEMPO_ISSUE_ID` and the duration automatically.
- Use only ASCII characters in the description — the Tempo API rejects non-ASCII.
- Always use node https or node -e with JSON.stringify for the POST body — never curl with shell string interpolation.
- Always `export` the vars after sourcing `.env` — `source .env` alone does not make them visible inside Node.js child processes.
- `TEMPO_API_TOKEN` and `TEMPO_ACCOUNT_ID` typically stay constant across every repo you use this command in (one Tempo identity); only `TEMPO_ISSUE_ID` changes per project.
