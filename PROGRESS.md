# PROGRESS

## Session — 2026-06-18

### What was done

**Ported `/run` skill from source repo**

- Created `.claude/skills/run/SKILL.md` — sanitised from `wur-executive` (removed Keycloak auth, client routes, custom ports)
- Added `.mcp.json` with `@playwright/mcp@latest` so Playwright MCP is available without manual setup
- Added `"mcp__playwright__*"` to `permissions.allow` in `.claude/settings.json`
- Iterated the skill based on what actually worked: Windows requires PowerShell (not Bash) to launch `npm run dev`; `npm install` guard needed on first run; explicit `mcp__playwright__browser_navigate` + `mcp__playwright__browser_take_screenshot` tool calls documented

**Bug fix: objectives list not updating after create**

- Root cause: `getObjectives()` uses `{ next: { revalidate: 30 } }` but the `handleCreate` server action was missing `revalidatePath('/objectives')` before the redirect
- Fix: added `revalidatePath('/objectives')` in `apps/web/src/app/objectives/page.tsx`
- Verified with Playwright: new objectives now appear immediately after submission

### Docs updated

- `docs/development/engineering-standards.md` — added "Cache revalidation after mutations" pattern under Data Fetching: always call `revalidatePath`/`revalidateTag` before `redirect()` in server actions

### Open questions / next steps

- The objectives list has no styling — purely functional stub
- No issue exists for the revalidation bug fix; was discovered during `/run` verification
