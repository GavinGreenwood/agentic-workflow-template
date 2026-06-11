---
allowed-tools: Bash(cat:*), Bash(npm install:*), Bash(npm run:*)
description: Post-pull sync — checks for missing .env vars, installs dependencies, regenerates clients, and builds.
---

## Your Task

### Step 1 — Check for missing .env variables

For each app/package that has a `.env.example`, compare its keys against the corresponding `.env`:

- Extract the key list from both files (lines matching `KEY=`, ignoring comments).
- Diff the two key lists.
- If any keys from `.env.example` are absent from `.env`, list them clearly:

  > **<path>/.env is missing the following variables (added to .env.example):**
  >
  > - `VARIABLE_NAME`
  > - ...

If all files are complete, report: "All .env files are up to date."

If a `.env` file does not exist at all, warn the user:

> **<path>/.env does not exist.** Copy from `.env.example` and fill in the values before continuing.

**Do not auto-fill or create .env files.** Only report — the developer must action this.

If there are missing variables or missing files, **stop here** and ask the user to resolve them before continuing. Do not proceed to Step 2 until the user confirms they have updated their `.env` files.

---

### Step 1b — Check for value drift

For variables that exist in both files but whose values differ from the `.env.example` recommendation: many differences are expected (real credentials, environment-specific URLs), but some may indicate that the `.env.example` defaults were intentionally updated (e.g. a rate limit tuned, a model name changed) and the developer's local `.env` is now stale.

For each drifted variable, display it in a table (show the example value only — never echo the developer's local value, which may be a secret):

| Variable | Example recommends | Action needed? |
| -------- | ------------------ | -------------- |

Then add a note:

> Review the table above. If any of these look like intentional default changes (numeric tuning values, flags, model names) rather than per-developer credentials, update your `.env` to match. If you're unsure, leave your current value and continue.

Do **not** block on this step — value drift is informational only.

---

### Step 2 — Install dependencies

Run: `npm install`

Report success or any errors. If `npm install` fails, stop and surface the error — do not continue.

---

### Step 3 — Regenerate generated clients (if applicable)

If the project uses a code generator (e.g. Prisma: `npm run prisma:generate --if-present`), run it now and report the result.

---

### Step 4 — Build

Run: `npm run build`

Report success or any errors.

---

### Summary

End with a clear status block, e.g.:

```
✓ .env files — up to date
✓ npm install — complete
✓ codegen — complete
✓ build — complete

You're in sync with main.
```

Or if something failed or was skipped, reflect that clearly.
