#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts) => path.join(root, ...parts);
const read = (...parts) => fs.readFileSync(at(...parts), "utf8");

const manualSkills = [
  "briefing",
  "bump-version",
  "capture",
  "dependabot-review",
  "fix-cicd",
  "log-time",
  "main",
  "morning",
  "multi-repo",
  "nightly-check",
  "pickup",
  "pr-action-review-mine-loop",
  "pr-action-review",
  "pr-chore",
  "pr-review-loop",
  "pr",
  "push",
  "qa-review-action",
  "refine",
  "sync",
];
const automaticSkills = ["assign-epic", "run"];
const roleSkills = ["advisor", "worker", "morlock"];

function frontmatter(markdown, file) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert(match, `${file} must start with YAML frontmatter`);
  return match[1];
}

function assertSkill(name) {
  const file = `.agents/skills/${name}/SKILL.md`;
  assert(fs.existsSync(at(file)), `${file} is missing`);
  const metadata = frontmatter(read(file), file);
  assert.match(
    metadata,
    new RegExp(`^name: ${name}$`, "m"),
    `${file} has the wrong name`,
  );
  assert.match(metadata, /^description:\s*\S/m, `${file} needs a description`);
  return metadata;
}

assert.equal(
  read("CLAUDE.md"),
  "@AGENTS.md\n",
  "CLAUDE.md must only import AGENTS.md",
);
assert(fs.existsSync(at("AGENTS.md")), "AGENTS.md is missing");
assert.match(
  read("AGENTS.md"),
  /A skill whose description starts with `User-invoked only\.` may start only when the user names it/,
  "AGENTS.md must give Copilot the manual-only routing rule",
);

const claudeSkills = at(".claude", "skills");
assert.equal(
  fs.lstatSync(claudeSkills).isSymbolicLink(),
  true,
  ".claude/skills must be a symlink",
);
assert.equal(
  fs.readlinkSync(claudeSkills),
  "../.agents/skills",
  ".claude/skills has the wrong target",
);
assert.equal(
  fs.realpathSync(claudeSkills),
  fs.realpathSync(at(".agents", "skills")),
  ".claude/skills must resolve to the canonical skill tree",
);

for (const name of manualSkills) {
  const metadata = assertSkill(name);
  assert.match(
    metadata,
    /^disable-model-invocation: true$/m,
    `${name} must be manual-only in Claude`,
  );
  assert.match(
    metadata,
    /^description: .*User-invoked only\./m,
    `${name} must tell Copilot it is user-only`,
  );

  const openaiFile = `.agents/skills/${name}/agents/openai.yaml`;
  assert(fs.existsSync(at(openaiFile)), `${openaiFile} is missing`);
  const openai = read(openaiFile);
  for (const key of ["display_name", "short_description", "default_prompt"]) {
    assert.match(
      openai,
      new RegExp(`^  ${key}:\\s*\\S`, "m"),
      `${openaiFile} needs ${key}`,
    );
  }
  const shortDescription = openai.match(
    /^  short_description: "([^"]+)"$/m,
  )?.[1];
  assert(
    shortDescription &&
      shortDescription.length >= 25 &&
      shortDescription.length <= 64,
    `${openaiFile} short_description must be 25-64 characters`,
  );
  assert(
    openai.includes(`$${name}`),
    `${openaiFile} default_prompt must explicitly invoke $${name}`,
  );
  assert.match(
    openai,
    /^  allow_implicit_invocation: false$/m,
    `${name} must be manual-only in Codex`,
  );
}

for (const name of automaticSkills) {
  const metadata = assertSkill(name);
  assert.doesNotMatch(
    metadata,
    /^disable-model-invocation:/m,
    `${name} must remain available to agents`,
  );
  assert.equal(
    fs.existsSync(at(".agents", "skills", name, "agents", "openai.yaml")),
    false,
    `${name} must not disable implicit Codex invocation`,
  );
}

for (const name of roleSkills) {
  assertSkill(name);
  for (const file of [
    `.claude/agents/${name}.md`,
    `.codex/agents/${name}.toml`,
    `.github/agents/${name}.agent.md`,
  ]) {
    assert(fs.existsSync(at(file)), `${file} is missing`);
    assert.match(
      read(file),
      new RegExp(
        `\\.agents/skills/${name}/SKILL\\.md|skills:\\s*\\n\\s*- ${name}`,
      ),
      `${file} must load ${name}`,
    );
  }
}

for (const name of [...manualSkills, ...automaticSkills, ...roleSkills]) {
  const file = at(".agents", "skills", name, "SKILL.md");
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(/\]\(([^)#]+\.md)(?:#[^)]+)?\)/g)) {
    if (/^https?:/.test(match[1])) continue;
    const target = path.resolve(path.dirname(file), match[1]);
    assert(fs.existsSync(target), `${file} links to missing ${match[1]}`);
  }
  for (const match of markdown.matchAll(
    /`(\.agents\/skills\/[^`]+\/SKILL\.md)`/g,
  )) {
    assert(
      fs.existsSync(at(match[1])),
      `${file} routes to missing ${match[1]}`,
    );
  }
  assert.doesNotMatch(
    markdown,
    /\$ARGUMENTS|!`|ScheduleWakeup|run_in_background|\.claude\/commands|CLAUDE\.md/,
    `${file} contains provider-specific workflow syntax`,
  );
}

assert.equal(
  fs.existsSync(at(".claude", "commands")),
  false,
  ".claude/commands must not duplicate skills",
);
for (const forbidden of [
  ".copilot",
  ".github/copilot-instructions.md",
  ".github/mcp.json",
]) {
  assert.equal(
    fs.existsSync(at(forbidden)),
    false,
    `${forbidden} must not be added`,
  );
}

const sharedMcp = JSON.parse(read(".mcp.json"));
assert.deepEqual(sharedMcp.mcpServers?.playwright, {
  type: "stdio",
  command: "npx",
  args: ["-y", "@playwright/mcp@latest"],
});
const codexConfig = read(".codex/config.toml");
assert.match(codexConfig, /^\[features\]\nhooks = true$/m);
assert.match(codexConfig, /^\[mcp_servers\.playwright\]$/m);
assert.match(codexConfig, /^command = "npx"$/m);
assert.match(codexConfig, /^args = \["-y", "@playwright\/mcp@latest"\]$/m);
assert.match(codexConfig, /^required = true$/m);

const claudeHooks = JSON.parse(read(".claude/settings.json"));
const codexHooks = JSON.parse(read(".codex/hooks.json"));
const copilotHooks = JSON.parse(read(".github/hooks/agentic-workflow.json"));
assert.equal(copilotHooks.version, 1, "Copilot hooks need schema version 1");
for (const [runtime, hooks] of [
  ["claude", claudeHooks],
  ["codex", codexHooks],
  ["copilot", copilotHooks],
]) {
  const serialised = JSON.stringify(hooks);
  for (const event of ["PreToolUse", "PostToolUse", "Stop"]) {
    assert(hooks.hooks?.[event], `${runtime} is missing ${event}`);
  }
  assert(
    serialised.includes(`pre-tool-use.js ${runtime}`),
    `${runtime} does not use the shared policy`,
  );
  assert(
    serialised.includes("post-tool-use.sh"),
    `${runtime} does not use the shared formatter`,
  );
  assert(
    serialised.includes("stop-docs-sync.sh"),
    `${runtime} does not use the shared docs reminder`,
  );
}

function runPolicy(runtime, payload) {
  const result = spawnSync(
    process.execPath,
    [at("scripts/hooks/pre-tool-use.js"), runtime],
    {
      input: JSON.stringify(payload),
      encoding: "utf8",
    },
  );
  assert.equal(
    result.status,
    0,
    `${runtime} policy exited ${result.status}: ${result.stderr}`,
  );
  return result.stdout ? JSON.parse(result.stdout) : null;
}

assert.equal(
  runPolicy("claude", {
    tool_name: "Bash",
    tool_input: { command: "rm -rf /" },
  }).hookSpecificOutput.permissionDecision,
  "deny",
);
assert.equal(
  runPolicy("claude", {
    tool_name: "Bash",
    tool_input: { command: "git push --no-verify" },
  }).hookSpecificOutput.permissionDecision,
  "ask",
);
assert.equal(
  runPolicy("codex", {
    tool_name: "exec_command",
    tool_input: { cmd: "git push --no-verify" },
  }).hookSpecificOutput.permissionDecision,
  "deny",
);
assert.equal(
  runPolicy("copilot", {
    toolName: "bash",
    toolArgs: { command: "git push --no-verify" },
  }).permissionDecision,
  "ask",
);
assert.equal(
  runPolicy("codex", {
    tool_name: "apply_patch",
    tool_input: {
      command:
        "*** Begin Patch\n*** Update File: .github/workflows/ci.yml\n*** End Patch",
    },
  }).hookSpecificOutput.permissionDecision,
  "deny",
);
assert.equal(
  runPolicy("copilot", { tool_name: "edit", tool_input: { path: ".env" } })
    .permissionDecision,
  "ask",
);
assert.equal(
  runPolicy("claude", {
    tool_name: "Bash",
    tool_input: { command: "git status" },
  }),
  null,
);

console.log(
  `Agent workflow parity passed for ${manualSkills.length} manual workflows, ${automaticSkills.length} automatic skills, and ${roleSkills.length} shared roles.`,
);
