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

### Data Fetching

Prefer server-side data fetching (e.g. Next.js server components). Presentational components receive data as props; they do not fetch.

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
