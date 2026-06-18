---
name: run
description: Launch and drive this project's app for visual verification. Reads ports from env files, checks if servers are already running, starts them if needed, and guides Playwright-based screenshot and interaction.
---

# Run — Launch and verify the app

Use this skill whenever you need to start the app and visually verify a UI change.

---

## Step 1 — Read the actual ports

**This step is mandatory. Never skip it. Never assume a port.**

Read ports from the env files before doing anything else:

```bash
grep -E "^PORT=" apps/web/.env 2>/dev/null || echo "PORT=3000"   # web port  (default 3000)
grep -E "^PORT=" apps/api/.env 2>/dev/null || echo "PORT=3001"   # API port  (default 3001)
```

- If `apps/web/.env` is missing, copy `apps/web/.env.example` → `apps/web/.env.local` and fill in the required values, then re-read.
- `WEB_PORT` = `PORT` value from `apps/web/.env` if present; otherwise default to `3000`.
- `API_PORT` = `PORT` value from `apps/api/.env` if present; otherwise default to `3001`.

**Every URL constructed in subsequent steps must use these values.** Using any other port is wrong.

---

## Step 2 — Check if servers are already running

Check both independently:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:<WEB_PORT>/
curl -s -o /dev/null -w "%{http_code}" http://localhost:<API_PORT>/healthz
```

Interpret the result as follows:

- **`000`** — connection refused; the server is not running.
- **Any other code (200, 302, 401, 404, 503, etc.)** — TCP connection succeeded; the server is up.

- **Both up** → skip to Step 4.
- **One or both down** → proceed to Step 3.

Do **not** loop or sleep-poll. One check only. If not ready, say so and let the user know to try again in ~10 s.

---

## Step 3 — Start the dev servers (only if not running)

Use the Bash tool with `run_in_background: true`:

```bash
npm run dev
```

This must be run with `run_in_background: true` — without it the agent will hang indefinitely waiting for the server process to exit. Then do a **single** readiness check after a short wait (~10 s). If still not responding, report it and stop — do not loop.

---

## Step 4 — Navigate to the app

Use the **Playwright MCP** (`playwright`) to navigate to:

```
http://localhost:<WEB_PORT>/
```

---

## Step 5 — Handle authentication (if applicable)

If the app redirects to a login page, check `apps/web/.env` for test credentials:

```bash
grep -E "^(TEST_USER|TEST_EMAIL|TEST_USERNAME|E2E_USERNAME)=" apps/web/.env
grep -E "^(TEST_PASSWORD|TEST_PASS|E2E_PASSWORD)=" apps/web/.env
```

Fill in the credentials and submit. Wait for the redirect to the main app before continuing.

If no auth is configured, skip this step.

---

## Step 6 — Drive the app

Navigate, click, and inspect as needed for the verification task. Key routes for this template:

| Route  | What it shows       |
| ------ | ------------------- |
| `/`    | Landing / home page |
| `/api` | API root (NestJS)   |

Adjust routes to match the feature under test.

---

## Step 7 — Screenshots and snapshots

- **Screenshots** are saved to the **project root** (e.g. `./screenshot.png`). Read them from the absolute path.
- Use snapshots (accessibility tree / DOM snapshot) to locate element references before clicking.
- Use screenshots for visual before/after comparisons.

---

## Notes

- The API exposes `/healthz` and `/readyz` for readiness checks (NestJS default from this template).
- Next.js dev server starts on port 3000 by default; NestJS starts on 3001. Override with `PORT=` in the respective `.env` file.
- `npm run dev` at the repo root uses Turborepo and starts both `apps/web` and `apps/api` concurrently.
