# Coding Standards

<!-- TEMPLATE: These are the standards the agent codes against. Adjust to your
     stack — but keep them concrete. Vague standards produce vague code. -->

## TypeScript & Code Style

- TypeScript strict mode throughout. No `any` — use `unknown` and narrow with type guards where the type is genuinely uncertain.
- ESLint + Prettier enforced via pre-commit hooks. Never disable rules without a comment.
- Conventional Commits format for all commit messages.
- `async/await` throughout — no raw Promise chains or callbacks.
- Use `Promise.all()` for independent async operations; never `await` sequentially when parallelism is safe.
- Always handle Promise rejections — every async call site has a `try/catch` or propagates the error explicitly.
- Use guard clauses (early returns) to avoid nesting. Extract named functions rather than deepening indentation.
- Each function does one thing. Keep functions small and side-effect-free where possible.

---

## Clean Code Principles

### SOLID

| Principle                 | How it applies                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Single Responsibility** | Each class/module has one reason to change. The API client fetches. The validator checks. The repository persists.             |
| **Open/Closed**           | New behaviours are added as new strategies — never by modifying existing code.                                                 |
| **Liskov Substitution**   | Repository interfaces are interchangeable — real DB and in-memory test implementations honour the same contract.               |
| **Interface Segregation** | Separate interfaces for separate concerns. No fat multi-purpose services.                                                      |
| **Dependency Inversion**  | Use cases depend on repository and client interfaces, not on the database or external SDKs directly. DI wires them at runtime. |

### Additional Principles

- **SLAP** — Don't mix abstraction levels within a function. High-level orchestration and low-level detail belong in separate functions.
- **DRY** — Extract duplicated logic into shared utilities.
- **Simplicity** — Prefer the simplest solution that satisfies the requirement. Do not over-engineer for hypothetical future needs.

---

## Architecture

### Layer Boundaries

```
Entities <- Use Cases <- Interface Adapters <- Frameworks & Drivers
```

Rules:

- Domain models must never import framework packages.
- Use cases must never reference HTTP status codes or request/response objects.
- All services and repositories are injected via constructors — never instantiated directly.
- Use strategy patterns for validation pipelines — add new checks as new strategies, not modifications to existing code.

---

## Data Patterns

### DTOs and Validation

Define explicit DTO types for all values crossing system boundaries — API requests/responses, third-party payloads. Validate with a schema library (e.g. Zod) at system edges.

### Database Migrations

Every schema change requires a versioned migration file committed in the same PR. No manual DDL. Migrations run in CI and on deployment.

---

## Frontend

### Styling

This project uses **Tailwind CSS v4** (CSS-first, no `tailwind.config.ts` needed). The PostCSS plugin is `@tailwindcss/postcss`. Global styles live in `apps/web/src/app/globals.css` and consist of a single `@import "tailwindcss"` directive.

Design tokens in use: `slate` for neutrals, `indigo-600` for the primary accent, `rounded-xl` cards, `shadow-sm` elevation, `bg-slate-50` page background. Keep new UI consistent with these.

Font: Inter loaded via `next/font/google` in `apps/web/src/app/layout.tsx`.

### Data Fetching

Prefer server-side data fetching (e.g. Next.js server components). Presentational components receive data as props; they do not fetch.

**Cache revalidation after mutations:** When a server action mutates data, always call `revalidatePath` (or `revalidateTag`) before redirecting. Without it, Next.js serves the cached response and the mutation appears not to have taken effect.

```ts
// server action — correct pattern
await createObjective(dto);
revalidatePath("/objectives"); // bust the cache first
redirect("/objectives"); // then redirect
```

### i18n

Organise translation keys by feature/page namespace, not as a flat file. Never hardcode user-facing strings — all UI text goes through the localisation system. A key added to the default locale must be added to every locale in the same change.

---

## Testing

Refer to [quality-strategy.md](quality-strategy.md) for all testing standards and conventions.

---

## Security

- **OWASP Top 10** compliance required; scanned in CI.
- **Input validation at all system boundaries** — validate API requests and third-party responses before use. Do not trust external input.
- **Parameterised queries only** — never interpolate variables into SQL strings.
- **No secrets in code or committed files** — all config comes from environment variables.
- **Principle of Least Privilege** — IAM roles, database users, and API scopes get minimum required access.
- **Defence in depth for access control** — auth enforced at multiple independent layers (middleware, service, query). A defect in one layer must not leak data.

---

## Dependency Management

The root `package.json` `overrides` block is the only supported way to force a transitive dependency to a specific version. Four rules keep it trustworthy.

**Verify an override actually applied.** npm will silently reuse an existing `node_modules` tree rather than fail loudly when it cannot resolve a fresh one, and in that state overrides have no effect. A partial clean is not enough — deleting only the lockfile still lets npm hydrate stale versions from disk. To confirm an override took:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules package-lock.json
npm install
npm ls <package>          # every path should show the overridden version
```

**Scope overrides by major version when consumers disagree.** An unscoped override applies tree-wide, including to packages that require an older, API-incompatible major. Use the `name@major` form (e.g. `"picomatch@2"`) so only the intended range is affected. A tree-wide `glob: "10.5.0"` override previously broke `test-exclude`, which needs glob v7's function export — the failure surfaced as an unrelated-looking `promisify` type error during coverage collection.

**An exact-pin override is a snapshot, and it goes stale.** Every entry here pins an exact version, so an override written to _escape_ an advisory silently becomes the thing _holding you on_ the vulnerable version once the next advisory lands. `brace-expansion: "5.0.8"` was the correct fix when written; GHSA-rgw5-rvv9-x895 later moved the fix line to `5.0.9`, and the override was the only reason CI could not resolve a patched copy. When a high-severity advisory names a package that already appears in this block, suspect the override before reaching for the allowlist — the fix is usually a one-line bump, not a new exemption.

Bump to the lowest version that clears the advisory rather than to `latest`, and keep the override inside the range its consumers declare. `fast-uri` is reached only via `ajv@8` (`^3.0.6`); with the fix in `3.1.5` and `latest` at `4.1.2`, the correct move was a major-scoped `fast-uri@3` at `3.1.5` — taking 4.x would have crossed ajv's declared range to buy nothing.

**Peer-range overrides are a last resort, and must be justified.** When a linked tool is genuinely compatible but upstream has not widened its `peerDependencies`, a nested override (e.g. forcing `eslint-plugin-react`'s `eslint` peer to `$eslint`) is acceptable. Prefer bumping to a release with native support where one exists. Never reach for `--legacy-peer-deps` or `--force` to paper over the conflict: an unresolvable tree stops npm re-resolving anything, which quietly freezes every transitive dependency at its current version.

### Audit allowlists

`audit-ci.jsonc` gates CI on high-severity advisories. Before allowlisting anything, confirm the fixed version is genuinely unreachable — `npm audit`'s `range` field is a **union across all advisories** for a package, so it routinely implies no fix exists when one does. Check the individual advisory instead.

Never accept `npm audit fix --force` output unread; it resolves by downgrading, and has proposed dropping `next` from 16.x to 9.3.3.

Every allowlist entry needs a rationale, an expected resolution, and any mitigating controls. Remove entries once upstream ships a fix — audit-ci prints a `Consider not allowlisting` hint when an entry is no longer needed.
