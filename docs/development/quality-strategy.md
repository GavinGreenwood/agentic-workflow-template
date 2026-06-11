# Quality Strategy

<!-- TEMPLATE: Fill in your project's specific test layout, runner choices, and
     coverage thresholds. The structure below is what the agent contract expects. -->

## Test Pyramid

| Layer       | Scope                                            | Runs                                               |
| ----------- | ------------------------------------------------ | -------------------------------------------------- |
| Unit        | One function/class, all dependencies mocked      | pre-push, CI on every push                         |
| Integration | Module + real infrastructure (DB, queue) locally | CI on every push                                   |
| E2E         | Full stack through the browser                   | CI on every push / nightly                         |
| Mutation    | The tests themselves (Stryker or equivalent)     | incremental pre-push (warn-only), nightly full run |
| Security    | OWASP scanning, dependency audit                 | CI on every push                                   |
| A11y        | WCAG AA via axe-core or equivalent               | CI on every push                                   |

## Standards

- **Coverage floor:** 70% unit coverage. Never reduce it.
- **TDD by default:** the failing test is written before the implementation (see CLAUDE.md).
- **Tests assert behaviour, not implementation** — a test that breaks on refactor without a behaviour change is a bad test.
- **Mutation testing keeps the tests honest:** coverage proves code was executed; mutants prove the assertions actually constrain it. Surviving mutants are a warning locally and a gate nightly.
- **Flakes are defects:** a test that fails non-deterministically more than twice in 7 days gets a ticket (see `/nightly-check`).
- **No hard-coded credentials in tests:** tests read credentials from environment variables and throw clearly when absent. The only exception is a mocked secrets provider returning fixture values.
