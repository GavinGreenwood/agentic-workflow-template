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

**Tailwind CSS v4 + full UI styling**

- Installed `tailwindcss` + `@tailwindcss/postcss` in `apps/web`
- Created `postcss.config.mjs`, `globals.css` (`@import "tailwindcss"`)
- Added `Navbar` component with sticky top bar, brand + nav links
- Added Inter font via `next/font/google` in `layout.tsx`
- Styled all 5 pages: home, objectives list, objective detail, dashboard, check-in
- Design language: `slate` neutrals, `indigo-600` accent, `rounded-xl` cards, `shadow-sm`, `bg-slate-50` background
- Also applied missing `revalidatePath` to objective detail and check-in server actions

### Docs updated

- `docs/development/engineering-standards.md` — added "Cache revalidation after mutations" pattern under Data Fetching
- `docs/development/engineering-standards.md` — added "Styling" section documenting Tailwind v4 setup, design tokens, and font

### Open questions / next steps

- No issues exist for the styling work or the revalidation bug fixes; all were discovered and fixed during `/run` verification sessions
