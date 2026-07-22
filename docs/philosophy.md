# The Engineering Philosophy

This workflow is an implementation of the ideas in two Mark Ridley articles. They are the required reading for anyone working in (or adapting) this repo:

1. [**Augmented Engineering for Grown-Ups**](https://www.linkedin.com/pulse/augmented-engineering-grown-ups-mark-ridley-llkve/)
2. [**Building Robust Quality Gates for AI-Augmented Development**](https://medium.com/p/d0ab1943082f)

Also recommended: [Claude Code in Action](https://anthropic.skilljar.com/claude-code-in-action) (Anthropic's free course) — how the agent itself works end-to-end.

## The five ideas, and where they live in this repo

### 1. Deterministic quality gates

An AI agent's output cannot be trusted on vibes — it must be checked by machines, the same way every time. Quality is enforced by scripts and pipelines, not by reading every line.

**In this repo:** `scripts/verify.sh` runs the identical suite locally that CI runs remotely. The agent is contractually required (CLAUDE.md) to run it before every PR. Hooks make bypassing it inconvenient by default and impossible without a human approving.

### 2. Swiss cheese defence

Every individual check has holes. Layer enough of them, misaligned, and nothing gets through. No single gate needs to be perfect — the _system_ is what's trusted.

**In this repo, the layers in firing order:**

| Layer            | When it fires                     | What it catches                                                                                                  |
| ---------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| PreToolUse hook  | before the agent runs any command | catastrophic actions: force-push, `rm -rf`, DROP TABLE, `--no-verify`, schema push without migration             |
| PostToolUse hook | after every file write            | formatting and lint noise — silently fixed, never reaches a diff                                                 |
| Stop hook        | when the agent ends a turn        | docs drifting from code — one reminder per change-set                                                            |
| pre-commit       | on `git commit`                   | direct commits to protected branches, lint-staged, secret detection, i18n key parity                             |
| pre-push         | on `git push`                     | format/lint/typecheck/tests, schema-without-migration, PROGRESS.md leaking to main, incremental mutation testing |
| CI               | on every push                     | the full suite, deterministically, on clean infrastructure                                                       |
| AI self-review   | on every PR                       | 8-lens review (correctness, types, OWASP, WCAG, coverage, conventions, docs, performance) before a human looks   |
| Human review     | last                              | judgement: spot-checking, architecture, intent                                                                   |

### 3. Layered hooks

The hook layers above are deliberately _dumb_. The PreToolUse hook is regex, not LLM judgement — it cannot be argued with, cannot be persuaded, and runs in milliseconds. Determinism at the bottom, intelligence at the top.

### 4. End-to-end traceability

Every change must be traceable in both directions: from the issue to the deployed code, and from any line of code back to the decision that motivated it.

**In this repo:** issue → branch name → commit messages → PR (with issue link, test evidence, risk, rollback) → merge closes the issue. ADRs record the _why_ behind architectural decisions and are immutable — superseded, never edited.

### 5. The learning loop

When something slips through, the response is never "review harder" — it's "which layer should have caught this, and how do we tighten it?" Every escaped defect becomes a new test, a new hook pattern, or a new line in the agent contract. The system compounds.

**In this repo:** PROGRESS.md captures discoveries during a session; the end-of-feature ritual reads it back and folds the lessons into docs, gates, and CLAUDE.md. The Morlock agent (`.claude/agents/morlock.md`) institutionalises this for security: every vulnerability found becomes a permanent test.

## The division of labour

The human's job moves up the stack: writing good issues (the agent implements exactly what the ticket says), making architectural decisions, reviewing for intent, and tightening the system. The agent's job is everything mechanical: implementation, tests, formatting, review responses, CI triage, dependency maintenance, time logging.

Code review changes meaning: it is spot-checking the system's output, not proofreading the agent's work. If review keeps finding the same class of problem, that's not a review problem — it's a missing gate.
