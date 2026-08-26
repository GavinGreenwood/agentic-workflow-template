#!/usr/bin/env bash
#
# Materialise .claude/skills as a link to the canonical .agents/skills tree.
#
# Run automatically by the root package.json "prepare" script, so `npm install`
# repairs the link the same way it installs the git hooks. Leaving this to the
# docs meant people missed it, and a broken link is silent: the agent simply
# finds zero skills.
#
# This script NEVER exits non-zero. A failing "prepare" takes the whole
# `npm install` down with it, and a degraded agent setup is a far better
# outcome than a developer who cannot install dependencies at all. When it
# cannot repair the link it says so loudly, prints the manual fix, and exits 0.
#
# It is also idempotent, and the health check runs before anything is removed.
# That ordering is load-bearing: a Windows directory junction is a legitimate
# healthy state, and `git checkout -- .claude/skills` DESTROYS the real tree
# when one is in place (git clears the path first and recurses through the
# junction to do it). Bailing out early on a healthy path is what keeps this
# script from being the very trap documented in docs/development/local-setup.md.

set -u

LINK=".claude/skills"
CANON=".agents/skills"
WIN_LINK='.claude\skills'   # cmd's rmdir wants backslashes

warn() { printf '\n[setup-links] %s\n' "$*" >&2; }

# Resolve a path to its physical location. Works for directories on every
# platform, and covers POSIX symlinks and Windows junctions alike — unlike
# `readlink -f`, which is not portable and reports a junction's recorded
# target rather than where it lands.
resolve() { [ -e "$1" ] && (cd "$1" 2>/dev/null && pwd -P); }

is_windows() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    MINGW* | MSYS* | CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

manual_fix() {
  cat >&2 <<'HINT'
  Fix it by hand (from the repository root):

    git config core.symlinks true
    rm -f .claude/skills && git checkout -- .claude/skills

  If Windows Developer Mode is unavailable, use a directory junction instead:

    mklink /J .claude\skills "%CD%\.agents\skills"

  Do NOT run `git checkout -- .claude/skills` once a junction is in place —
  it deletes the real .agents/skills contents through the junction.

  See docs/development/local-setup.md § Windows: the `.claude/skills` link.
HINT
}

root=$(git rev-parse --show-toplevel 2>/dev/null) || root=""
if [ -z "$root" ]; then
  root=$(cd "$(dirname "$0")/.." 2>/dev/null && pwd -P) || root=""
fi
if [ -z "$root" ] || ! cd "$root" 2>/dev/null; then
  warn "could not locate the repository root — skipping the $LINK check."
  exit 0
fi

if [ ! -d "$CANON" ]; then
  warn "$CANON does not exist — nothing to link. Skipping."
  exit 0
fi

canon_real=$(resolve "$CANON")
if [ -z "$canon_real" ]; then
  warn "could not resolve $CANON — skipping the $LINK check."
  exit 0
fi

# --- Healthy? Exit before touching anything. -------------------------------
# Comparing resolved locations (rather than merely checking that a link
# exists) is what catches a link pointing into a DIFFERENT clone. An absolute
# link target committed by mistake still resolves cleanly in every other
# clone — straight into the original clone's skill tree, silently.
if [ "$(resolve "$LINK")" = "$canon_real" ]; then
  exit 0
fi

# --- Clear the path, carefully ---------------------------------------------
if [ -L "$LINK" ]; then
  # A symlink, or a junction that bash reports as one. `rm -f` unlinks it
  # without following it. `rm -rf` is banned in this script: on a junction it
  # recurses into the real tree and deletes the skills.
  rm -f "$LINK" 2>/dev/null || true
elif [ -d "$LINK" ]; then
  # A junction, an empty directory, or somebody's real populated directory.
  # Plain rmdir tells the three apart for us: it removes a junction or an
  # empty directory and REFUSES a populated one, which is exactly the
  # behaviour we want — never destroy real work at this path.
  if is_windows; then
    cmd //c rmdir "$WIN_LINK" >/dev/null 2>&1 || true
  else
    rmdir "$LINK" 2>/dev/null || true
  fi
  if [ -d "$LINK" ]; then
    warn "$LINK is a non-empty directory, not a link. Refusing to delete it."
    warn "Move or remove it yourself, then re-run \`npm install\`."
    manual_fix
    exit 0
  fi
elif [ -e "$LINK" ]; then
  # The 17-byte text file Git writes when core.symlinks=false.
  rm -f "$LINK" 2>/dev/null || true
fi

if [ -e "$LINK" ] || [ -L "$LINK" ]; then
  warn "could not clear $LINK, so it was not handed to git."
  manual_fix
  exit 0
fi

# --- Re-materialise it -----------------------------------------------------
# Scoped to this clone (local config, not --global) and reversible with
# `git config --unset core.symlinks`. Never reached when the link is healthy.
git config core.symlinks true 2>/dev/null || true
git checkout -- "$LINK" 2>/dev/null || true

if [ "$(resolve "$LINK")" = "$canon_real" ]; then
  printf '[setup-links] repaired %s -> %s\n' "$LINK" "../$CANON"
  exit 0
fi

warn "could not materialise $LINK as a link to $CANON."
warn "Agents will find zero skills until this is fixed, and \`npm run verify:agents\` will fail."
manual_fix
exit 0
