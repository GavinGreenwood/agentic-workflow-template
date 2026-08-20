#!/usr/bin/env node
/**
 * Codex records consent to run each project hook as a `trusted_hash` under
 * `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` in the user's
 * Codex config. A handler runs only when its status is Managed or Trusted, so an
 * untrusted `.codex/hooks.json` means the PreToolUse safety policy, the
 * PostToolUse formatter, and the Stop docs reminder are all silently inert —
 * no error, no warning, every dangerous command allowed through.
 *
 * The hash covers the handler's normalised config, so editing `.codex/hooks.json`
 * flips trust to Modified and stops the hooks again until they are re-reviewed.
 *
 * This check fails when a handler has never been trusted on this machine. It does
 * not distinguish Trusted from Modified: doing so means reproducing Codex's hash
 * (sha256 over key-sorted canonical JSON of the normalised handler identity),
 * which would report false Modified results whenever that internal shape changes.
 * Codex does expose the authoritative status — Trusted, Modified, Untrusted or
 * Managed — through the app-server `hooks/list` request, so this is an upgrade
 * path rather than an impossibility; it is not used here because `codex
 * app-server` is experimental and a gate that must also run where Codex is
 * absent should not depend on it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skip = (why) => {
  console.log(`Codex hook trust: skipped — ${why}.`);
  process.exit(0);
};

if (spawnSync("codex", ["--version"], { stdio: "ignore" }).status !== 0) {
  skip("codex is not installed on this machine");
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const configPath = path.join(codexHome, "config.toml");
if (!fs.existsSync(configPath)) {
  skip(`no Codex config at ${configPath}, so no hook has been reviewed yet`);
}

const hooksPath = path.join(root, ".codex", "hooks.json");
const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8")).hooks ?? {};

// Codex's own key labels for the events this repo registers.
const EVENT_KEYS = {
  PreToolUse: "pre_tool_use",
  PostToolUse: "post_tool_use",
  Stop: "stop",
  SessionStart: "session_start",
  SessionEnd: "session_end",
  UserPromptSubmit: "user_prompt_submit",
  PreCompact: "pre_compact",
  PostCompact: "post_compact",
  PermissionRequest: "permission_request",
  SubagentStart: "subagent_start",
  SubagentStop: "subagent_stop",
};

const expected = [];
for (const [event, groups] of Object.entries(hooks)) {
  const label = EVENT_KEYS[event];
  if (!label) {
    console.error(`Unknown Codex hook event "${event}" in ${hooksPath}.`);
    process.exit(1);
  }
  groups.forEach((group, groupIndex) => {
    (group.hooks ?? [group]).forEach((handler, handlerIndex) => {
      expected.push({
        event,
        key: `${hooksPath}:${label}:${groupIndex}:${handlerIndex}`,
        command: handler.command ?? "(non-command handler)",
      });
    });
  });
}

const config = fs.readFileSync(configPath, "utf8");
const trusted = new Set();
for (const match of config.matchAll(
  /\[hooks\.state\."([^"]+)"\]\s*\n(?:(?!\s*\[)[^\n]*\n)*?\s*trusted_hash\s*=/g,
)) {
  trusted.add(match[1]);
}

const untrusted = expected.filter((entry) => !trusted.has(entry.key));

if (untrusted.length === 0) {
  console.log(
    `Codex hook trust: all ${expected.length} project hooks are recorded as trusted in ${configPath}.`,
  );
  console.log(
    "Reminder: editing .codex/hooks.json changes each handler's hash, which flips it to Modified and stops it running until you review the hooks again.",
  );
  process.exit(0);
}

console.error(
  `Codex hook trust: ${untrusted.length} of ${expected.length} project hooks in .codex/hooks.json have never been trusted on this machine.`,
);
console.error(
  "Codex runs a handler only when it is Managed or Trusted, so these are silently inert right now — the PreToolUse safety policy does not block anything, the PostToolUse formatter does not run, and the Stop docs reminder never fires.\n",
);
for (const entry of untrusted) {
  console.error(`  ${entry.event}\n    ${entry.command}`);
}
console.error(
  "\nTo fix: run `codex` interactively in this repository and approve the hooks when it asks you to review them. Codex then writes a trusted_hash for each handler into",
);
console.error(`  ${configPath}`);
console.error(
  "\nFor automation that already vets the hook source, `codex exec --dangerously-bypass-hook-trust ...` runs enabled hooks without persisted trust for that invocation. Do not use it as a substitute for reviewing them on a workstation.",
);
console.error(
  "\nSee docs/development/local-setup.md § Codex: trusting the repository hooks.",
);
process.exit(1);
