#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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
const roleDescriptions = {
  advisor:
    "On-demand strategic advisor running on a more capable model. Consult before committing to a consequential decision — a non-trivial design choice, a risky refactor, an ambiguous tradeoff, or when the executor is stuck. It advises; it does not edit. Invoke it deliberately, not every turn.",
  worker:
    "Cheap, fast worker running on a lighter model for well-specified grunt work — bulk grepping, mechanical edits, log-trawling, gathering file contents, routine lookups. Delegate here when the task is clear and low-judgement so the main loop's context and cost stay reserved for the hard calls.",
};

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
const agentContract = read("AGENTS.md");
assert.match(
  agentContract,
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
    `${name} must be manual-only in Claude and Copilot CLI`,
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
  const metadata = assertSkill(name);
  const expectedDescription = roleDescriptions[name];
  if (expectedDescription) {
    assert(
      metadata.includes(expectedDescription),
      `.agents/skills/${name}/SKILL.md must preserve the original role description`,
    );
  }
  for (const file of [
    `.claude/agents/${name}.md`,
    `.codex/agents/${name}.toml`,
    `.github/agents/${name}.agent.md`,
  ]) {
    assert(fs.existsSync(at(file)), `${file} is missing`);
    const adapter = read(file);
    assert.match(
      adapter,
      new RegExp(
        `\\.agents/skills/${name}/SKILL\\.md|skills:\\s*\\n\\s*- ${name}`,
      ),
      `${file} must load ${name}`,
    );
    if (expectedDescription) {
      assert(
        adapter.includes(expectedDescription),
        `${file} must preserve the original role description`,
      );
    }
  }
}

assert.match(
  read(".github/agents/advisor.agent.md"),
  /^model: gpt-5\.6-sol$/m,
  "Copilot advisor must use the more capable model it promises",
);
assert.match(
  read(".github/agents/worker.agent.md"),
  /^model: gpt-5\.6-luna$/m,
  "Copilot worker must use the lighter model it promises",
);

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
  assert.doesNotMatch(
    markdown,
    new RegExp(`(?<![A-Za-z0-9_.-])/(?:${manualSkills.join("|")})(?=[\\s<\`])`),
    `${file} contains a provider-specific slash command`,
  );
}

const runSkill = read(".agents/skills/run/SKILL.md");
assert.match(
  agentContract,
  /should browse, test, and verify the running app as part of the build experience \(e\.g\. via the Playwright MCP server\)/,
  "AGENTS.md must preserve the original Playwright recommendation",
);
assert.doesNotMatch(
  `${agentContract}\n${runSkill}`,
  /must browse|Playwright is required|Do not use another browser tool as a fallback/,
  "Playwright must not be strengthened from a recommendation into a hard requirement",
);

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

function commandHandlers(hooks) {
  return Object.values(hooks.hooks)
    .flatMap((groups) => groups)
    .flatMap((group) => group.hooks ?? [group])
    .filter((handler) => handler.type === "command");
}

for (const [runtime, hooks, events] of [
  ["claude", claudeHooks, ["PreToolUse", "PostToolUse", "Stop"]],
  ["codex", codexHooks, ["PreToolUse", "PostToolUse", "Stop"]],
  ["copilot", copilotHooks, ["preToolUse", "postToolUse", "agentStop"]],
]) {
  const serialised = JSON.stringify(hooks);
  for (const event of events) {
    assert(hooks.hooks?.[event], `${runtime} is missing ${event}`);
  }
  assert(
    serialised.includes("pre-tool-use.js") && serialised.includes(runtime),
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

for (const handler of commandHandlers(claudeHooks)) {
  assert(
    handler.args === undefined,
    "Claude hooks must be one command string: other runtimes read this file and run only the command field",
  );
  assert(
    handler.command.includes(
      "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}",
    ),
    "Claude hook scripts must resolve from CLAUDE_PROJECT_DIR, falling back to the Git root",
  );
}
for (const handler of commandHandlers(codexHooks)) {
  assert(
    handler.command.includes("$(git rev-parse --show-toplevel)"),
    "Codex hook scripts must resolve from the Git root",
  );
}
for (const handler of commandHandlers(copilotHooks)) {
  assert(
    typeof handler.bash === "string" &&
      handler.bash.includes("$(git rev-parse --show-toplevel)"),
    "Copilot hooks must use the documented bash key and resolve from the Git root",
  );
}

const nestedCodexHook = spawnSync(
  commandHandlers(codexHooks).find((handler) =>
    handler.command.includes("pre-tool-use.js"),
  ).command,
  {
    cwd: at("apps/api"),
    shell: true,
    input: JSON.stringify({
      tool_name: "exec_command",
      tool_input: { cmd: "git status" },
    }),
    encoding: "utf8",
  },
);
assert.equal(
  nestedCodexHook.status,
  0,
  `Codex hook failed from apps/api: ${nestedCodexHook.stderr}`,
);

function runStopHook(runtime) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "agent-stop-hook-"));
  try {
    const init = spawnSync("git", ["init", "--quiet"], {
      cwd: fixture,
      encoding: "utf8",
    });
    assert.equal(
      init.status,
      0,
      `Could not create Stop hook fixture: ${init.stderr}`,
    );
    const hookDir = path.join(fixture, "scripts", "hooks");
    fs.mkdirSync(hookDir, { recursive: true });
    fs.copyFileSync(
      at("scripts/hooks/stop-docs-sync.sh"),
      path.join(hookDir, "stop-docs-sync.sh"),
    );
    fs.writeFileSync(path.join(fixture, "source.js"), "export {};\n");
    return spawnSync(
      "bash",
      ["scripts/hooks/stop-docs-sync.sh", ...(runtime ? [runtime] : [])],
      { cwd: fixture, encoding: "utf8" },
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

const defaultStop = runStopHook();
assert.equal(
  defaultStop.status,
  2,
  "Claude and Codex Stop hooks must continue",
);
assert.match(defaultStop.stderr, /DOCS SYNC:/);

const copilotStop = runStopHook("copilot");
assert.equal(copilotStop.status, 0, "Copilot Stop hook must return JSON");
assert.deepEqual(JSON.parse(copilotStop.stdout), {
  decision: "block",
  reason:
    "DOCS SYNC: re-read AGENTS.md § Documentation Sync before stopping if this turn changed code, added a pattern, modified source or config, or introduced a new behaviour. Update PROGRESS.md and any affected docs/ files in the same change.",
});

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
  runPolicy("copilot", {
    toolName: "bash",
    toolArgs: '{"command":"git push --no-verify"}',
  }).permissionDecision,
  "ask",
);
assert.equal(
  runPolicy("copilot", {
    toolName: "apply_patch",
    toolArgs:
      "*** Begin Patch\n*** Update File: .github/workflows/ci.yml\n*** End Patch\n",
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
  runPolicy("copilot", {
    tool_name: "apply_patch",
    tool_input: {
      command:
        "*** Begin Patch\n*** Update File: safe.js\n*** Move to: .env\n*** End Patch",
    },
  }).permissionDecision,
  "ask",
);
assert.equal(
  runPolicy("claude", {
    tool_name: "Bash",
    tool_input: { command: "git status" },
  }),
  null,
);

const formatterFixture = fs.mkdtempSync(
  path.join(os.tmpdir(), "agent-format-hook-"),
);
try {
  const binDir = path.join(formatterFixture, "bin");
  const callLog = path.join(formatterFixture, "npx.log");
  fs.mkdirSync(binDir);
  fs.writeFileSync(
    path.join(formatterFixture, "moved.js"),
    "const value = 1;\n",
  );
  const fakeNpx = path.join(binDir, "npx");
  fs.writeFileSync(
    fakeNpx,
    '#!/usr/bin/env bash\nprintf \'%s\\n\' "$*" >> "$HOOK_LOG"\n',
  );
  fs.chmodSync(fakeNpx, 0o755);
  const result = spawnSync("bash", [at("scripts/hooks/post-tool-use.sh")], {
    cwd: formatterFixture,
    input: JSON.stringify({
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: old.js\n*** Move to: moved.js\n*** End Patch",
      },
    }),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      HOOK_LOG: callLog,
    },
  });
  assert.equal(result.status, 0, `PostToolUse move failed: ${result.stderr}`);
  assert.match(fs.readFileSync(callLog, "utf8"), /prettier --write moved\.js/);

  fs.writeFileSync(path.join(formatterFixture, "styled.ts"), "const y = 2;\n");
  const copilotFormat = spawnSync(
    "bash",
    [at("scripts/hooks/post-tool-use.sh")],
    {
      cwd: formatterFixture,
      input: JSON.stringify({
        toolName: "create",
        toolArgs: JSON.stringify({ filePath: "styled.ts" }),
      }),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        HOOK_LOG: callLog,
      },
    },
  );
  assert.equal(
    copilotFormat.status,
    0,
    `PostToolUse copilot payload failed: ${copilotFormat.stderr}`,
  );
  assert.match(fs.readFileSync(callLog, "utf8"), /prettier --write styled\.ts/);

  fs.writeFileSync(path.join(formatterFixture, "patched.ts"), "const z = 3;\n");
  const copilotPatch = spawnSync(
    "bash",
    [at("scripts/hooks/post-tool-use.sh")],
    {
      cwd: formatterFixture,
      input: JSON.stringify({
        toolName: "apply_patch",
        toolArgs:
          "*** Begin Patch\n*** Add File: patched.ts\n+const z = 3;\n*** End Patch\n",
      }),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        HOOK_LOG: callLog,
      },
    },
  );
  assert.equal(
    copilotPatch.status,
    0,
    `PostToolUse copilot apply_patch failed: ${copilotPatch.stderr}`,
  );
  assert.match(
    fs.readFileSync(callLog, "utf8"),
    /prettier --write patched\.ts/,
  );
} finally {
  fs.rmSync(formatterFixture, { recursive: true, force: true });
}

console.log(
  `Agent workflow parity passed for ${manualSkills.length} manual workflows, ${automaticSkills.length} automatic skills, and ${roleSkills.length} shared roles.`,
);
