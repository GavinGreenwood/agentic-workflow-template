# CI/CD Pipeline

This project uses **GitHub Actions** for all CI and CD automation. There is no push to a registry by
default — the pipeline builds, versions, smoke-tests, and scans images, then stops. A disabled push
stub (guarded with `if: false`) is included so adopters can enable it in one line.

---

## Pipeline overview

```
push / PR
  │
  ├── Stage 1 (parallel fast checks)
  │     lint · typecheck · unit-tests · integration-tests
  │     i18n-check · code-health · openapi
  │
  ├── Stage 2 (needs: all stage 1)
  │     build (artifact) · security (reusable workflow)
  │
  ├── Stage 3 (needs: build)
  │     e2e (Playwright + postgres + redis services)
  │
  ├── Stage 4 (independent)
  │     version (GitVersion → semver output)
  │
  └── Stage 5 (needs: e2e + security + version)
        image-api · image-web
          ├── docker build --build-arg APP_VERSION=<semver>
          ├── ci-smoke-test.sh (health + version probes)
          ├── Trivy scan (blocking on fixable CRITICAL)
          └── [push disabled — see below]
```

## Workflows

| File                                     | Trigger                                 | Purpose                  |
| ---------------------------------------- | --------------------------------------- | ------------------------ |
| `.github/workflows/ci.yml`               | PR, push to `main`, `workflow_dispatch` | Full pipeline            |
| `.github/workflows/security.yml`         | `workflow_call`, `workflow_dispatch`    | Reusable security job    |
| `.github/workflows/nightly-security.yml` | Daily 06:00 UTC                         | Calls `security.yml`     |
| `.github/workflows/nightly-mutation.yml` | Weekdays 02:00 UTC                      | Stryker mutation testing |
| `.github/workflows/morlock.yml`          | Nightly 01:00 UTC                       | Claude security probe    |

## Versioning

Semantic versions are computed by [GitVersion](https://gitversion.net) in `ContinuousDelivery` mode
(`GitVersion.yml`). The `version` job runs with `fetch-depth: 0` so GitVersion can walk the full
git history. Its `semver` output flows into the docker build args and image tags of Stage 5.

`package.json` versions stay at `0.0.0` — the real version comes only from CI.

### Version bump rules

| Situation                                | Version bump                             |
| ---------------------------------------- | ---------------------------------------- |
| Merge to `main`                          | Minor (e.g. `1.2.0`)                     |
| Feature branch build                     | Pre-release patch (e.g. `1.2.0-alpha.3`) |
| Commit message contains `+semver: major` | Major                                    |
| Commit message contains `+semver: minor` | Minor                                    |
| Commit message contains `+semver: patch` | Patch                                    |
| Commit message contains `+semver: none`  | No bump                                  |

## Image push (disabled by default)

The image build jobs contain a commented-out push step guarded with `if: false`. To enable:

1. Uncomment and adjust the push step in `ci.yml` (`image-api` and `image-web` jobs).
2. Change `if: false` to your desired branch condition (e.g. `if: github.ref == 'refs/heads/main'`).
3. Add a registry login step (GHCR default is shown, commented out).
4. Provide the relevant secrets (`GITHUB_TOKEN` is already available for GHCR).

Default image names: `app-api`, `app-web`. Default registry: `ghcr.io/${{ github.repository }}`.

## Smoke test

`scripts/ci-smoke-test.sh` is run by Stage 5 after each image build. It:

1. Starts the image in a container.
2. Waits for `/healthz` to respond.
3. Asserts `/version` returns `{ "version": "<semver>" }` — **build fails on mismatch**.
4. Cleans up the container.

Pass `POSTGRES_DSN` and `REDIS_URL` env vars to the script if sidecars are needed.

## Security pipeline

`security.yml` (called by `ci.yml` Stage 2 and `nightly-security.yml`) runs:

- **npm audit** — fails on `high` severity
- **Secretlint** — scans all files for committed secrets
- **CycloneDX SBOM** — generates `sbom.json`, uploaded as an artifact
- **Semgrep** — `p/owasp-top-ten`, `p/javascript`, `p/typescript`, `p/nodejs` rulesets; SARIF uploaded to the Security tab

### npm overrides — keeping the audit gate green

Transitive dependencies that Dependabot cannot bump directly are pinned via the `overrides` block in root `package.json`. This lets the `--audit-level=high` gate stay green without requiring breaking upgrades to direct dependencies.

**Current overrides and why they exist:**

| Package       | Pinned to | Root cause                                                                    |
| ------------- | --------- | ----------------------------------------------------------------------------- |
| `glob`        | `10.5.0`  | `@nestjs/cli` devDep (CLI injection)                                          |
| `tmp`         | `0.2.7`   | `@nestjs/cli` devDep (path traversal)                                         |
| `picomatch@2` | `2.3.2`   | `@angular-devkit` via `@nestjs/cli` (ReDoS)                                   |
| `picomatch@4` | `4.0.4`   | `@angular-devkit` via `@nestjs/cli` (ReDoS)                                   |
| `lodash`      | `4.18.1`  | `@nestjs/swagger` + `@nestjs/config` (prototype pollution)                    |
| `multer`      | `2.2.0`   | `@nestjs/platform-express` (DoS — no file-upload endpoints, safe to override) |

**Note on `multer`**: npm `overrides` does not propagate to workspace-nested packages when the depender uses an exact version pin. The `multer@2.2.0` entry is therefore applied directly in `package-lock.json` (lockfile patch). `npm ls multer` will report `invalid: "2.1.1"` — this is expected and intentional. When `@nestjs/platform-express` releases a version that depends on `multer@>=2.2.0`, both the lockfile patch and the `overrides` entry can be removed.

**Maintenance rule:** when a HIGH-severity transitive finding appears:

1. Add an override entry to `overrides` in root `package.json` pinning to the safe version.
2. Run `npm install` to regenerate the lockfile.
3. If the override doesn't propagate (workspace-nested exact pin), patch the lockfile entry directly.
4. When the direct dependency ships a clean upgrade via Dependabot, remove the override and any lockfile patch at that point.

Trivy runs separately per image in Stage 5 with two passes: blocking on fixable CRITICAL, SARIF report for CRITICAL+HIGH.

## Morlock

`morlock.yml` runs nightly at 01:00 UTC. It invokes the Claude Code action seeded with the Morlock
security-probe persona (`.claude/agents/morlock.md`). The agent:

1. Reads and analyses the codebase for security weaknesses.
2. Writes proving tests under `apps/api/integration/security/`.
3. Opens a PR (`morlock/<date>`) and a summary issue.

This is **non-blocking** — it runs as a nightly antibody generator, not a merge gate.

**Required secret:** `ANTHROPIC_API_KEY`

## Required secrets / variables

| Name                | Required by    | Notes                                                                                |
| ------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | `morlock.yml`  | Claude Code action                                                                   |
| `SEMGREP_APP_TOKEN` | `security.yml` | Optional — Semgrep runs without it but results won't appear in the Semgrep dashboard |

All other secrets (external service URLs, registry credentials) are only needed when you enable the
corresponding features in your project. See comments in `ci.yml` for guidance.

## Local parity

`scripts/verify.sh` runs the same checks as Stage 1 + build, locally. Run it before opening a PR.
The CI and the local script must remain in sync — if you add a check to one, add it to the other.
