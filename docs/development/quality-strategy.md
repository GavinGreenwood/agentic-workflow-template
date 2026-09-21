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
- **Observed red:** every test is seen failing for the right reason before it counts (see `AGENTS.md` § TDD Workflow).
- **Tests assert behaviour, not implementation** — a test that breaks on refactor without a behaviour change is a bad test.
- **Mutation testing keeps the tests honest:** coverage proves code was executed; mutants prove the assertions actually constrain it. Surviving mutants are a warning locally and a gate nightly.
- **Flakes are defects:** a test that fails non-deterministically more than twice in 7 days gets a ticket (see `nightly-check`).
- **No hard-coded credentials in tests:** tests read credentials from environment variables and throw clearly when absent. The only exception is a mocked secrets provider returning fixture values.

## Web unit tests (`apps/web`)

Web tests run under Jest + `jest-environment-jsdom` with React Testing Library. Conventions:

- **Async server components** are rendered by awaiting the component function and passing the result to `render` — e.g. `render(await ObjectivesPage())`, or `render(await ObjectivePage({ params: Promise.resolve({ id }) }))` for pages that take `params`.
- **Data access is mocked at the module boundary:** `jest.mock("../../lib/okr-api", …)` — presentational components receive data, they do not fetch, so tests drive them by mocking the API client. For `fetch`-based units, assign `global.fetch = jest.fn()` (jsdom does not provide it) and resolve a minimal `{ ok, status, json }` object.
- **Server-action helpers are never invoked in unit tests.** `next/cache` and `next/navigation` are mocked globally in `jest.setup.ts` so importing a page does not drag in the full Next server runtime; `TextEncoder` is polyfilled there for the same reason.
- **jest-dom matcher types** (`toBeInTheDocument`, `toHaveAttribute`) are pulled into the TS program via `src/types/jest-dom.d.ts`, because `jest.setup.ts` lives outside `src` and its augmentation would otherwise be invisible to `tsc`/eslint.
- The 70% coverage floor applies to the whole `apps/web` `src` tree — page/layout server components included — so new pages ship with tests.

## API unit tests (`apps/api`)

NestJS 12 publishes every `@nestjs/*` package as ESM-only (`"type": "module"`, no CommonJS build). The API's own source is still compiled to CommonJS, so Jest has to be able to `require()` an ES module.

Jest 30 supports `require(esm)` on Node 24.9+, but gates it behind an internal capability probe: it checks for `vm.SourceTextModule.prototype.hasAsyncGraph`, and `vm.SourceTextModule` is only exposed when Node runs with `--experimental-vm-modules`. Without the flag the probe fails and every API spec dies at its first import with:

```
Must use import to load ES Module: node_modules/@nestjs/testing/index.js
```

This is why `apps/api`'s `test` script invokes Jest through Node directly rather than via the `jest` bin:

```json
"test": "node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --coverage"
```

Do not "simplify" this back to `jest --coverage` — the bin shim cannot pass the flag, and the whole API suite fails to run. A bare `NODE_OPTIONS=... jest` prefix is not a substitute either: npm scripts run through `cmd.exe` on Windows, where that syntax is not understood.

The flag is only needed for the test runner. At runtime Node 24 enables `require(esm)` by default, so `node dist/main` boots against NestJS 12 with no flag.

`apps/web` is unaffected and deliberately left on the plain `jest` bin — the shared preset in `packages/jest-config` carries no ESM configuration, so the blast radius stays in `apps/api`.

### `@nestjs/schematics` is held at v11

Every `@nestjs/schematics@12.x` declares a peer of `typescript@>=6.0.0`, while this monorepo is on TypeScript 5.x. Schematics is a scaffolding-only devDependency — it is not on the build or test path — so it stays at `^11.0.0` until TypeScript is upgraded. Bumping it alone makes the dependency tree unresolvable (and `--legacy-peer-deps`/`--force` are forbidden; see engineering-standards § Dependency Management).
