---
allowed-tools: Bash(cat:*), Bash(npm install:*), Bash(npm run build:*)
description: Post-pull sync — checks for missing .env vars, installs dependencies, and builds.
---

## Your Task

### Step 1 — Check for missing .env variables

Compare the keys in `.env.example` against your `.env`.

If `.env` does not exist, warn the user and stop:

> **`.env` does not exist.** Copy from `.env.example` and fill in the values before continuing.

If any keys from `.env.example` are absent from `.env`, list them:

> **`.env` is missing the following variables (added to `.env.example`):**
>
> - `VARIABLE_NAME`

If all keys are present, report: "`.env` is up to date."

If there are missing variables or missing files, **stop here** and ask the user to resolve them before continuing.

---

### Step 2 — Install dependencies

Run: `npm install`

Report success or any errors. If `npm install` fails, stop and surface the error — do not continue.

---

### Step 3 — Build

Run: `npm run build`

Report success or any errors.

---

### Summary

End with a clear status block:

```
✓ .env — up to date
✓ npm install — complete
✓ build — complete

You're in sync with main.
```

Or if something failed or was skipped, reflect that clearly.
