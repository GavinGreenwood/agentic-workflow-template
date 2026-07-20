# Adopt these standards into your repo

> **You are an AI coding agent reading this because someone asked you to import
> the agentic workflow standards from
> <https://github.com/GavinGreenwood/agentic-workflow-template> into the repo
> you are running in.** This file is your playbook. Follow it top to bottom.
>
> **The one rule that matters: adapt, do not copy.** This template was built
> for a specific stack (TypeScript, Next.js + NestJS, npm, Husky, Jira,
> GitHub Actions). The repo you are in is almost certainly different. Your job
> is to carry over the _intent_ of each part — deterministic quality gates,
> layered hooks, end-to-end traceability, the learning loop
> ([docs/philosophy.md](docs/philosophy.md)) — expressed in the target repo's
> own language, tools, and conventions. A verbatim copy is a failed adoption.

Work through the phases in order. **Do not write any files until you have
finished Phase 2 and the human has approved the plan in Phase 3.**

---

## Phase 0 — Load both sides

1. **Read this template.** Fetch and read these files from this repo (use the
   raw GitHub URLs, `https://raw.githubusercontent.com/GavinGreenwood/agentic-workflow-template/main/<path>`,
   or clone it to a temp dir):
   - `CLAUDE.md` — the agent contract
   - `CONTRIBUTING.md` — branching, commits, PRs
   - `docs/philosophy.md` — the _why_; this is the part that must survive translation
   - `.claude/settings.json` and `scripts/hooks/` — the hook layer
   - `scripts/verify.sh` and `.husky/` — the gate layer
   - `.claude/commands/` — the slash-command workflow loop
   - `README.md` § "The commands" — a one-line summary of each command

2. **Read the target repo** (the one you are running in). Do not assume —
   inspect. Establish, with evidence from actual files:
   - **Language(s)** and version (e.g. `pyproject.toml`, `go.mod`, `package.json`, `Cargo.toml`).
   - **Package manager / task runner** (npm/pnpm/yarn, uv/poetry, cargo, go, make, poe, just…).
   - **Lint + format tool** (ruff, eslint+prettier, gofmt, clippy…).
   - **Test framework** and how tests are laid out.
   - **Existing quality gates** — any CI config, any git hooks, any `verify`-like script already present.
   - **Issue tracker** (Jira? GitHub Issues? Linear? none?).
   - **Git host** (GitHub? GitLab? Azure DevOps?) and how PRs/reviews happen.
   - **Branching model** (trunk/`main`-only? GitHub flow? Gitflow with `develop`? release branches?).
   - **Existing Claude Code setup** — any `.claude/` directory, `CLAUDE.md`, or hooks/commands already present to build on or reconcile with.

---

## Phase 1 — Report the translation map

Before asking anything, show the human you understand their repo. Produce a
short table mapping every template concept to its target-stack equivalent, and
flag anything that has **no** equivalent. Example shape (fill in from what you
actually found):

| Template (this repo)            | Target equivalent                         | Notes                                     |
| ------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `scripts/verify.sh` (npm chain) | e.g. `uv run poe verify` / `make verify`  | build from the target's own tasks         |
| Husky + lint-staged             | e.g. `pre-commit` / `lefthook`            | pick the target ecosystem's standard      |
| ESLint + Prettier               | e.g. `ruff` / `gofmt`                     | one gate, target's formatter              |
| Prisma schema/migration check   | (target's migration tool, or **drop**)    | drop if no DB/migrations                  |
| `npm run typecheck`             | (target's type checker, or **drop**)      | drop for dynamically-typed-only repos     |
| Jira REST calls in commands     | target tracker API, or GitHub Issues      | rewrite the `curl`/API calls              |
| GitHub Actions CI               | target's CI, or **defer** (record an ADR) | don't invent a pipeline they don't use    |
| `.claude/commands/`             | target repo's `.claude/commands/`         | keep the workflow loop under Claude's dir |

Anything in the "no equivalent" column is a **drop candidate** — call it out
explicitly rather than porting it dead.

---

## Phase 2 — Ask the adoption questions

**This is the heart of the adoption. Do not skip it and do not guess.** Present
these as a batch of decisions (use your question tool if you have one), each
with your **recommended default** and the trade-off, so the human can accept
the defaults quickly or override. Only ask the ones that are actually live for
this repo — if you already know the answer from Phase 0 (e.g. the repo clearly
has no database), state your assumption instead of asking.

Adapt the recommendation to what you found: your defaults should reflect the
target repo's maturity (a proof-of-concept and a production service warrant
different strictness).

1. **Issue tracker + how strict the ticket rule.**
   Which tracker, and: is "no work without a ticket" **absolute** (chore
   branches exempt), or **soft** (encouraged, linked when present)? Recommended:
   absolute for team/production repos, soft for solo/PoC. — _Trade-off: absolute
   buys full traceability at the cost of friction on tiny changes._

2. **Branching model + PR target.**
   Confirm the real model (trunk / GitHub flow / Gitflow) and which branch PRs
   target. Do **not** impose the template's model — mirror the target's. Update
   branch-protection hooks and command base-branches to match.

3. **Which quality-gate layers to adopt.**
   Walk the Swiss-cheese stack (PreToolUse, PostToolUse, Stop, pre-commit,
   pre-push, CI, AI self-review, human review) and confirm each. Recommended:
   adopt every layer the stack supports; a layer with no target equivalent
   (e.g. a typecheck gate in an untyped language) is dropped, not faked.

4. **Coverage gate.**
   Numeric floor (e.g. 70%) or "coverage never decreases"? Recommended: the
   ratchet ("never decreases") unless the team already runs a numeric floor. —
   _Trade-off: a floor is a firmer promise but noisy to introduce on a repo with
   low current coverage._

5. **TDD strictness.**
   Mandatory red-green-refactor, or recommended-with-exploratory-exception?
   Recommended: recommended-not-mandatory, but always keep "every feature/fix
   ships with tests." — _Trade-off: mandatory is purer but slows spikes._

6. **Session scratchpad (PROGRESS.md).**
   Keep the PROGRESS.md recovery-point convention, or drop it? Recommended:
   keep for long multi-session features; drop for small/solo repos where the
   Stop-hook nagging outweighs the benefit.

7. **CI ownership.**
   Add a CI pipeline now, or is CI owned elsewhere / deferred? If deferred,
   **record an ADR** saying so and make the local `verify` + hooks the interim
   gate. Recommended: don't create a GitHub Actions pipeline for a repo whose
   CI lives on another platform — document the decision instead.

8. **Which slash commands.**
   Full workflow loop (`/capture`, `/refine`, `/pickup`, `/pr`,
   `/pr-action-review`, review loops…) or a minimal subset? Recommended: the
   full loop — the commands _are_ the workflow. They live in the target repo's
   `.claude/commands/`, with the Jira/CI calls rewritten for the target's
   tools.

9. **Hook framework + secret scanning.**
   Pick the target ecosystem's standard hook manager (pre-commit for Python,
   Husky/lefthook for Node, …) and a secret scanner (detect-secrets, gitleaks,
   secretlint). Recommended: whatever is idiomatic for the stack, never a
   second package ecosystem just to run hooks.

Capture every answer — you will restate them in the plan and they become the
audit trail for _why this adoption looks the way it does_.

---

## Phase 3 — Propose a phased plan, then stop

Synthesise the answers into a concrete, phased plan and **wait for explicit
approval before writing anything.** A good plan separates:

- **Phase A — the stack-agnostic core**: the `CLAUDE.md` contract, `verify`
  task, git hooks, PR template, dependency automation.
- **Phase B — the Claude layer**: hooks wired to scripts, slash commands.
- **Phase C — docs**: philosophy (carried across near-verbatim; it is
  stack-agnostic), engineering standards + quality strategy rewritten for the
  target language, ADR scaffolding, an "adoption decisions" note recording the
  Phase 2 answers. Start that note with a one-line **provenance** breadcrumb so
  the workflow's origin — and the path to send improvements back — is not lost
  in translation:

  > Adapted from [agentic-workflow-template](https://github.com/GavinGreenwood/agentic-workflow-template)
  > by Gavin Greenwood (MIT). Found a general, non-project-specific improvement
  > to the workflow itself? PRs welcome upstream.

State what you are **not** bringing over and why. List any follow-ups (e.g.
"CI pipeline — deferred, ADR added").

---

## Phase 4 — Implement

- Work on a feature branch named per the target repo's convention (create a
  tracking ticket first if the human chose the absolute ticket rule).
- Build each phase in small, focused commits that explain _what and why_.
- **Use the target repo's own gates as you go** — run its `verify`/tests,
  install and smoke-test the hooks, exercise anything with runtime behaviour
  (e.g. the hook scripts) rather than assuming it works.
- Keep docs in sync in the same change. Follow the golden rule: docs describe
  the intended state; if you must deviate, flag it, don't silently diverge.

---

## Phase 5 — Verify and hand off

- Run the full local gate (the target's `verify` equivalent) until green.
- Confirm the hooks fire (make a throwaway commit that should trip a guard).
- Summarise: what landed, what was deliberately dropped, what is deferred, and
  the one-time setup a teammate must run after cloning.
- Raise the PR into the target's integration branch, filling its template.

---

**The lesson: the philosophy is portable; the mechanics are not.** Detect,
translate, ask, adapt.
