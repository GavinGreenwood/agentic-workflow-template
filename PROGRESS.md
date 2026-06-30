# Session Progress

## What was done

Switched the template from GitHub Issues / GitHub Project board to Jira as the primary issue tracker.

### Changes made

- **Synced `.claude/commands/`** from source repo (`c:\Code\wur-executive`) — all commands are now Jira-flavoured at the top level
- **Synced `.claude/agents/morlock.md`**, `.claude/settings.json`, and `CLAUDE.md` from source
- **Deleted `.claude/commands/jira/`** — no longer needed; Jira commands are now the default, not an alternative
- **Updated `README.md`** — removed `commands/jira/` references, updated "What's inside" tree, updated quickstart to describe Jira setup, updated "Adapting it" section
- **Updated `CONTRIBUTING.md`** — replaced GitHub Project board section with Jira setup, updated branch naming to `<ticket-id>-<description>`, updated commit format to `feat(PROJ-42):`, updated PR body guidance

### Still needed before committing

- **Scrub `CLAUDE.md`** — synced verbatim from client repo; contains `WEI-` Jira codes, client-specific tooling references, and other identifiers that must not appear in the public template
- **Scrub `.claude/commands/enrich.md`** — project-specific OpenAI data enrichment command; either delete or replace with a generic stub
- **Scrub `.claude/commands/multi-repo.md`** — references `wur-executive-3400/3410/3420` port slots
- **Scrub `.claude/commands/fix-cicd.md`** — likely references CircleCI (client's CI provider)
- **Scrub `.claude/commands/sync.md`** — likely references Prisma (client's ORM)
- **Scrub `.claude/settings.json`** — check for hardcoded client paths or hook config
- **Update `.env.example`** — remove `GH_PROJECT_*` vars, add `JIRA_*` vars
- **Update `.github/pull_request_template.md`** — `Closes #N` syntax may need updating
- Run `git diff` across all changed files before committing
