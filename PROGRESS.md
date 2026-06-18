# PROGRESS.md — #13: chore: introduce npm overrides to keep audit gate at --audit-level=high

**Branch:** 13-npm-overrides-audit-gate
**Started:** 2026-06-18

## Plan

1. Add `overrides` block to root `package.json` pinning the five transitive HIGH-severity packages.
2. Bump all NestJS packages v10 → v11 (consolidating PRs #8, #9, #10, #11).
3. Bump jest v29 → v30 (consolidating PR #12).
4. Bump GitHub Actions versions (consolidating PR #7).
5. Run `npm install` to regenerate lockfile.
6. Restore `--audit-level=high` in security.yml.
7. Update docs.
8. Close and delete the superseded Dependabot PRs/branches.

## Progress

- Applied all version bumps: NestJS v10→v11, @nestjs/swagger v7→v11, jest v29→v30, @types/express v4→v5, Actions checkout@v6/upload-artifact@v7/download-artifact@v8/gitversion@v4/codeql@v4.
- Added npm overrides for glob, tmp, picomatch@2, picomatch@4, lodash, multer.
- Discovered npm `overrides` doesn't propagate to workspace-nested exact-pinned packages — multer@2.1.1 (exact pin from @nestjs/platform-express) wouldn't be replaced via package.json overrides. Fixed by patching the lockfile entry directly (multer@2.2.0 in package-lock.json).
- Restored `--audit-level=high` in security.yml — `npm audit --audit-level=high` exits 0.
- Typecheck, lint, tests all pass (39/39 tests, 100% statements/functions).
- Documented the overrides pattern and multer lockfile-patch caveat in docs/development/ci-cd.md.
- Closed PRs #7–#12 (superseded), branches auto-deleted by GitHub.

## Decisions

- Lockfile patch for multer: npm overrides only work for root-level hoisted packages, not workspace-scoped exact pins. Patching the lockfile is the only reliable mechanism until NestJS bumps their pin past 2.2.0.
- Consolidated all 6 open Dependabot PRs into this single branch per user instruction.

## Open Questions

_None._
