# ADR-0001: Record architecture decisions

**Status:** Accepted
**Date:** <!-- date adopted -->

## Context

Architectural decisions get made in conversations, PRs, and heads — and then forgotten. When an AI agent is doing much of the implementation, the _why_ behind decisions must be written down, because the agent reads docs, not memories. The `/qa-review-action` command, for example, can only classify behaviour as "intended" by citing a documented decision.

## Decision

We record every significant architectural decision as an ADR in `docs/adr/`, numbered sequentially.

ADRs are **immutable** once accepted. The only permitted change is updating the status line to `Superseded by ADR-XXXX` with a pointer. All decision changes require a brand new ADR.

## Consequences

- The agent (and every new team member) can trace any behaviour back to its rationale.
- Push-back on QA feedback and review comments can cite concrete references instead of opinions.
- The decision history is append-only — you can always see what was believed, and when.
