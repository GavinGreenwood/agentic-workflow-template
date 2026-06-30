Verify, commit, and push — no PR.

1. Run `scripts/verify.sh` — if it fails, fix the issues and re-run. Do not skip.
2. Run `git status` and `git diff` to review all changes.
3. Create a commit following CONTRIBUTING.md conventions (ticket ID in message, conventional commit format).
4. Push the branch to origin with `-u` flag.

If any step fails, stop and explain. Do not force or skip gates.
