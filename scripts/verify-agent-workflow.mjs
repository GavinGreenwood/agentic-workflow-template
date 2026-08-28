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

// The hooks and hook commands in this repo are POSIX shell. Two things go wrong
// on Windows if that is left implicit: `shell: true` runs them under cmd.exe,
// which has no `unset` or `$(...)`, and a bare "bash" can resolve to
// System32\bash.exe — the WSL launcher, which fails with
// `execvpe(/bin/bash) failed` unless a distro is installed. Resolve Git Bash
// explicitly instead of depending on PATH order.
function resolvePosixShell() {
  if (process.platform !== "win32") return "bash";
  const candidates = [];
  const gitExecPath = spawnSync("git", ["--exec-path"], { encoding: "utf8" });
  if (gitExecPath.status === 0) {
    // .../Git/mingw64/libexec/git-core -> .../Git/bin/bash.exe
    let dir = gitExecPath.stdout.trim();
    while (dir && path.dirname(dir) !== dir) {
      candidates.push(path.join(dir, "bin", "bash.exe"));
      dir = path.dirname(dir);
    }
  }
  for (const base of [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA,
  ]) {
    if (base) candidates.push(path.join(base, "Git", "bin", "bash.exe"));
  }
  const system32 = path
    .join(process.env.SystemRoot ?? String.raw`C:\Windows`, "System32")
    .toLowerCase();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (resolved.toLowerCase().startsWith(system32)) continue;
    if (fs.existsSync(resolved)) return resolved;
  }
  return "bash";
}
const POSIX_SHELL = resolvePosixShell();

const manualSkills = [
  "briefing",
  "bump-version",
  "capture",
  "dependabot-review",
  "fix-cicd",
  "log-time",
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
  "wrap-up",
];
const automaticSkills = ["assign-epic", "run"];
const roleSkills = ["consultant", "morlock"];
const retiredRoles = ["worker"];
// Every role must say, in one machine-readable place, whether it may change
// state. Without this, a future role whose body promises "it does not edit" can
// be added with write tools and no exact tool list, and the verifier stays green
// -- demonstrated with a proposed `auditor` role. `readOnlyRoleTools` below is
// required to cover every role marked read-only here.
const roleStatePolicy = {
  consultant: "read-only",
  morlock: "stateful",
};
const roleDescriptions = {
  consultant:
    "Strategic consultant running on a more capable model. Use proactively before committing to a consequential decision — a non-trivial design choice, a risky refactor, an ambiguous tradeoff, or when the same failure has beaten you twice. It advises; it does not edit. Skip it for routine work that needs no second opinion.",
  morlock:
    "Probe the repository for reproducible security weaknesses and preserve confirmed findings as tests.",
};

function frontmatter(markdown, file) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert(match, `${file} must start with YAML frontmatter`);
  return match[1];
}

// A `tools:` value the read-only assertions below can actually trust. The
// runtimes parse real YAML; this is a deliberately small reader over the three
// shapes the adapters actually use, and it **fails closed** on anything else.
// That matters because a reader that silently returns a *narrower* list than the
// runtime grants is worse than no check at all -- it reports a guarantee that
// does not hold. Matching /^tools: .*$/ and defaulting to "" did exactly that,
// four ways, each verified against the whole verifier:
//   - no `tools` field at all, which both Claude Code and Copilot read as
//     "inherit every tool" -- the exact opposite of the guarantee;
//   - `tools:` with an empty value, for the same reason;
//   - a YAML block list, because the regex needs the value on the same line;
//   - a flow list continued on the next line (`tools: [read, search\n  , edit]`),
//     which is valid YAML and hid a write tool past the check completely.
// A YAML dependency would be the other way to fix this. It is deliberately not
// used: `yaml` is only a transitive dependency here, so a check that is the
// repo's load-bearing guarantee would start silently depending on another
// package's dependency tree. Failing closed needs no dependency and is the safer
// default -- an unreadable shape stops the build instead of passing quietly.
function parseToolList(metadata, file) {
  const lines = metadata.split(/\r?\n/);
  const index = lines.findIndex((line) => /^tools:/.test(line));
  assert(
    index !== -1,
    `${file} must declare a tools field: both Claude Code and Copilot read a missing one as "inherit every tool", so leaving it off silently removes the boundary the role description promises`,
  );
  const value = lines[index].replace(/^tools:[ \t]*/, "").trim();
  let raw;
  if (value === "") {
    // YAML block sequence. Take contiguous `- item` lines, and refuse anything
    // else indented under the key -- a comment or a wrapped scalar there would
    // truncate the list, which is the dangerous direction.
    const items = [];
    let cursor = index + 1;
    for (; cursor < lines.length; cursor += 1) {
      const item = lines[cursor].match(/^[ \t]+-[ \t]*(.+?)[ \t]*$/);
      if (item) {
        items.push(item[1]);
        continue;
      }
      assert(
        !/^[ \t]*\S/.test(lines[cursor]) || !/^[ \t]/.test(lines[cursor]),
        `${file} has content indented under tools that is not a list item (${lines[cursor].trim()}): this check will not guess what it grants`,
      );
      break;
    }
    // A blank line ends the loop above, so make sure no further list items are
    // hiding after one. Role frontmatter has no other sequences.
    assert(
      !lines.slice(cursor).some((line) => /^[ \t]+-[ \t]*\S/.test(line)),
      `${file} has tools list items separated by a blank line: fold them into one contiguous list so this check reads all of them`,
    );
    raw = items.join(",");
  } else if (value.startsWith("[")) {
    assert(
      value.endsWith("]"),
      `${file} declares a flow-style tools list that does not close on the same line: YAML allows that, but this check reads one line, so it would miss every tool after the break -- put the whole list on one line`,
    );
    raw = value.slice(1, -1);
  } else {
    assert(
      !value.includes("[") && !value.includes("#"),
      `${file} declares a tools value this check cannot read safely (${value})`,
    );
    raw = value;
  }
  const tools = raw
    .split(",")
    .map((tool) => tool.trim().replace(/^["']/, "").replace(/["']$/, ""))
    .filter(Boolean);
  assert(
    tools.length > 0,
    `${file} must declare a non-empty tools field: an empty list is read as "inherit every tool", so it removes the boundary the role description promises`,
  );
  return tools;
}

const toolList = (file) => parseToolList(frontmatter(read(file), file), file);

// Regression cases for the parser. Each rejection below is a shape that once
// passed the whole verifier while granting more than the role claimed; each
// acceptance is a shape the adapters really use. If a rejection stops throwing,
// the read-only assertions have gone back to failing open.
for (const [label, metadata] of [
  ["a missing tools field", "name: x\nmodel: opus"],
  ["an empty tools field", "name: x\ntools:\nmodel: opus"],
  ["an empty flow list", "name: x\ntools: []"],
  [
    "a flow list that does not close on its line",
    "name: x\ntools: [read, search\n  , edit]",
  ],
  [
    "a comment interrupting a block list",
    "name: x\ntools:\n  - read\n  # why\n  - edit",
  ],
  [
    "a blank line splitting a block list",
    "name: x\ntools:\n  - read\n\n  - edit",
  ],
  [
    "a trailing comment on an inline list",
    "name: x\ntools: read, search # and edit",
  ],
]) {
  assert.throws(
    () => parseToolList(metadata, `<${label}>`),
    /must declare|cannot read safely|not a list item|separated by a blank line|does not close on the same line/,
    `parseToolList must reject ${label}: reading fewer tools than the runtime grants reports a guarantee that does not hold`,
  );
}
assert.deepEqual(
  parseToolList("tools:\n  - Read\n  - Write", "<block list>"),
  ["Read", "Write"],
  "parseToolList must read a YAML block list: a multiline list containing Write used to score as empty and pass",
);
assert.deepEqual(
  parseToolList('tools: [read, search, "playwright/*"]', "<flow list>"),
  ["read", "search", "playwright/*"],
  "parseToolList must read a YAML flow list, including a quoted wildcard MCP grant",
);
assert.deepEqual(
  parseToolList("tools: Read, Grep, Glob", "<comma string>"),
  ["Read", "Grep", "Glob"],
  "parseToolList must read Claude Code's comma-separated string form",
);
assert.deepEqual(
  parseToolList("tools: Read, Grep, Glob\r\nmodel: opus", "<CRLF>"),
  ["Read", "Grep", "Glob"],
  "parseToolList must tolerate CRLF line endings",
);

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
for (const name of retiredRoles) {
  for (const file of [
    `.agents/skills/${name}`,
    `.claude/agents/${name}.md`,
    `.codex/agents/${name}.toml`,
    `.github/agents/${name}.agent.md`,
  ]) {
    assert.equal(fs.existsSync(at(file)), false, `${file} must stay removed`);
  }
}

// Naming a retired role's canonical file is not the only way to bring it back.
// A `.codex/agents/revived.toml` declaring `name = "worker"`, registered as
// `[agents."worker"]`, revived the retired role with the whole verifier still
// green -- the guard above only knows canonical filenames and the guard on
// config.toml only knew the unquoted table header. Assert the exact inventory of
// each adapter directory instead, so an adapter can only exist for a role that
// is currently declared, whatever the file is called.
const adapterInventory = [
  [".claude/agents", (name) => `${name}.md`],
  [".codex/agents", (name) => `${name}.toml`],
  [".github/agents", (name) => `${name}.agent.md`],
];
for (const [dir, filename] of adapterInventory) {
  assert.deepEqual(
    fs.readdirSync(at(dir)).sort(),
    roleSkills.map(filename).sort(),
    `${dir} must contain exactly one adapter per declared role: an extra file there can revive a retired role under a different name`,
  );
}
// ...and the name inside each adapter must match the file it lives in, so a
// declared role's file cannot be repurposed to spawn something else.
for (const name of roleSkills) {
  assert.match(
    read(`.claude/agents/${name}.md`),
    new RegExp(`^name: ${name}$`, "m"),
    `.claude/agents/${name}.md must declare name: ${name}`,
  );
  assert.match(
    read(`.codex/agents/${name}.toml`),
    new RegExp(`^name = "${name}"$`, "m"),
    `.codex/agents/${name}.toml must declare name = "${name}"`,
  );
  assert.match(
    read(`.github/agents/${name}.agent.md`),
    new RegExp(`^name: ${name}$`, "m"),
    `.github/agents/${name}.agent.md must declare name: ${name}`,
  );
}
assert.match(
  agentContract,
  /A skill whose description starts with `User-invoked only\.` may start only when the user names it/,
  "AGENTS.md must give Copilot the manual-only routing rule",
);
assert.match(
  agentContract,
  /A skill whose description starts with `Role adapter only\.` is a \*\*role body, not a workflow\*\*/,
  "AGENTS.md must exclude role bodies from normal skill routing",
);

const claudeSkills = at(".claude", "skills");
assert.equal(
  fs.lstatSync(claudeSkills).isSymbolicLink(),
  true,
  ".claude/skills must be a link to .agents/skills. On Windows, Git only writes a real link when symlink support is enabled — see docs/development/local-setup.md § Windows: the .claude/skills link.",
);
// Node reports both POSIX symlinks and Windows directory junctions as symlinks,
// but readlink returns platform separators, and a junction records an absolute
// path. Normalise separators, then require relative links to use the portable
// target; junctions are accepted on the realpath check below, which is the
// invariant that actually matters.
const skillLinkTarget = fs.readlinkSync(claudeSkills).split(path.sep).join("/");
assert(
  skillLinkTarget === "../.agents/skills" || path.isAbsolute(skillLinkTarget),
  `.claude/skills must point at ../.agents/skills (found ${skillLinkTarget})`,
);
// A junction created with a relative target resolves it against the creating
// process's working directory, not the link's parent, so it is easy to end up
// with a link that exists but points nowhere. Catch that before realpathSync
// throws a bare ENOENT.
assert(
  fs.existsSync(claudeSkills),
  `.claude/skills is a link but its target does not exist (points at ${skillLinkTarget}). Recreate it with an absolute target — see docs/development/local-setup.md § Windows: the .claude/skills link.`,
);
assert.equal(
  fs.realpathSync(claudeSkills),
  fs.realpathSync(at(".agents", "skills")),
  ".claude/skills must resolve to the canonical skill tree",
);

const onDiskSkills = fs
  .readdirSync(at(".agents", "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(
  onDiskSkills,
  [...manualSkills, ...automaticSkills, ...roleSkills].sort(),
  "every .agents/skills entry must be classified as manual, automatic, or role: an unclassified skill skips every guard below and stays silently model-selectable",
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
  assert.match(
    metadata,
    /^disable-model-invocation: true$/m,
    `${name} is a role body: Claude Code and Copilot CLI must not route to it as a skill`,
  );
  assert.match(
    metadata,
    /^user-invocable: false$/m,
    `${name} is a role body: it must not be invocable from the slash menu either, or the adapter's model and sandbox guarantees are bypassed`,
  );
  assert.match(
    metadata,
    /^description: "Role adapter only\./m,
    `${name} must tell the Copilot coding agent it is a role body, not a selectable skill`,
  );
  const roleOpenai = `.agents/skills/${name}/agents/openai.yaml`;
  assert(fs.existsSync(at(roleOpenai)), `${roleOpenai} is missing`);
  assert.match(
    read(roleOpenai),
    /^  allow_implicit_invocation: false$/m,
    `${name} is a role body: Codex must not invoke it implicitly`,
  );
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
    // Require the explicit skill path in every adapter. A bare `skills:` key is
    // unverifiable — the persona silently fails to load and the role's model and
    // sandbox guarantees become false.
    assert.match(
      adapter,
      new RegExp(`\\.agents/skills/${name}/SKILL\\.md`),
      `${file} must name .agents/skills/${name}/SKILL.md so the persona loads`,
    );
    assert.doesNotMatch(
      adapter,
      new RegExp(`skills:\\s*\\n\\s*- ${name}`),
      `${file} must not declare a skills: preload for ${name}: disable-model-invocation blocks skill preloading, so the key can never fire and only misleads`,
    );
    if (expectedDescription) {
      assert(
        adapter.includes(expectedDescription),
        `${file} must preserve the original role description`,
      );
    }
  }
}

// Every role must pin a model on every runtime. morlock previously pinned one
// only on Codex, so the same role ran on the session model elsewhere.
for (const name of roleSkills) {
  assert.match(
    read(`.claude/agents/${name}.md`),
    /^model: \S+$/m,
    `.claude/agents/${name}.md must pin a model`,
  );
  assert.match(
    read(`.codex/agents/${name}.toml`),
    /^model = "\S+"$/m,
    `.codex/agents/${name}.toml must pin a model`,
  );
  assert.match(
    read(`.github/agents/${name}.agent.md`),
    /^model: \S+$/m,
    `.github/agents/${name}.agent.md must pin a model`,
  );
  // Not just the read-only role: a missing tools field means "inherit
  // everything" on both runtimes, which erases whatever capability boundary the
  // role description claims. Codex has no per-role tool field.
  toolList(`.claude/agents/${name}.md`);
  toolList(`.github/agents/${name}.agent.md`);
}

assert.match(
  read(".github/agents/consultant.agent.md"),
  /^model: gpt-5\.6-sol$/m,
  "Copilot consultant must use the more capable model it promises",
);

// The consultant "advises; it does not edit" promise is only hard where the
// adapter withholds write tools. Codex cannot enforce it -- a role file's
// sandbox_mode does not constrain the spawned agent -- so the two runtimes that
// can, must. Assert the exact list rather than the absence of known write tools:
// a denylist cannot see a capability it has no name for, and it did not see that
// the Copilot adapter's `playwright/*` grant can click, type, and submit forms,
// which is a state change whatever it is called. Adding a tool here is now a
// deliberate edit to this list, not something a role file can do on its own.
const readOnlyRoleTools = {
  ".claude/agents/consultant.md": ["Read", "Grep", "Glob"],
  ".github/agents/consultant.agent.md": ["read", "search"],
};
assert.deepEqual(
  Object.keys(roleStatePolicy).sort(),
  [...roleSkills].sort(),
  "every declared role must have an entry in roleStatePolicy: an unclassified role gets no exact tool list, only the weak non-empty check",
);
for (const [name, policy] of Object.entries(roleStatePolicy)) {
  assert(
    ["read-only", "stateful"].includes(policy),
    `roleStatePolicy.${name} must be "read-only" or "stateful", not ${policy}`,
  );
  if (policy !== "read-only") continue;
  for (const file of [
    `.claude/agents/${name}.md`,
    `.github/agents/${name}.agent.md`,
  ]) {
    assert(
      Object.hasOwn(readOnlyRoleTools, file),
      `${file} is a read-only role per roleStatePolicy, so it must have an exact tool list in readOnlyRoleTools -- otherwise its read-only promise is enforced by nothing`,
    );
  }
}
for (const [file, expected] of Object.entries(readOnlyRoleTools)) {
  assert.deepEqual(
    toolList(file),
    expected,
    `${file} must grant exactly [${expected.join(", ")}]: the consultant's read-only promise is enforced by this list, not by the role body, so any addition -- a write tool, a shell, or a wildcard MCP grant that can change state -- has to be justified here first`,
  );
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
  assert.doesNotMatch(
    markdown,
    new RegExp(`(?<![A-Za-z0-9_.-])/(?:${manualSkills.join("|")})(?=[\\s<\`])`),
    `${file} contains a provider-specific slash command`,
  );
}

// The shared hooks are executed by all three runtimes, so their text must not
// name a workflow with one runtime's invocation syntax.
for (const dir of [".husky", "scripts/hooks"]) {
  for (const entry of fs.readdirSync(at(dir), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(dir, entry.name);
    assert.doesNotMatch(
      read(file),
      new RegExp(
        `(?<![A-Za-z0-9_.-])/(?:${manualSkills.join("|")})(?=[\\s<\`.,)])`,
      ),
      `${file} names a workflow with Claude Code slash syntax: the hooks are shared by all three runtimes, and Codex uses $name`,
    );
  }
}

// A required Step 0 block must run start to finish without a permission prompt,
// so every command it invokes has to be pre-approved in allowed-tools.
const shellKeywords = new Set([
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "for",
  "do",
  "done",
  "in",
  "while",
  "until",
  "case",
  "esac",
  "local",
  "return",
  "exit",
  "set",
  "unset",
  "break",
  "continue",
  "function",
  "time",
]);
for (const name of [...manualSkills, ...automaticSkills]) {
  const markdown = read(`.agents/skills/${name}/SKILL.md`);
  // Bound the match to the section: an unbounded scan reaches past the heading
  // and attributes a later step's block to Step 0.
  const section = markdown.match(
    /## Step 0 — Context \(required first\)([\s\S]*?)(?=\n## |$)/,
  );
  if (!section) continue;
  const step0 = section[1].match(/```bash\n([\s\S]*?)```/);
  if (!step0) continue;
  const allowed = new Set(
    [
      ...(markdown.match(/^allowed-tools: (.*)$/m)?.[1] ?? "").matchAll(
        /Bash\(([a-z0-9_.-]+)/g,
      ),
    ].map((entry) => entry[1]),
  );
  for (const line of step0[1].split("\n")) {
    for (const match of line.matchAll(
      /(?:^|[|;&]|\$\(|&&|\|\||\bthen\b|\bdo\b|\belse\b)\s*([a-z][a-z0-9_-]*)/g,
    )) {
      const command = match[1];
      if (shellKeywords.has(command)) continue;
      if (line[match.index + match[0].length] === "=") continue;
      assert(
        allowed.has(command),
        `.agents/skills/${name}/SKILL.md runs \`${command}\` in its "Step 0 — Context (required first)" block but does not allow-list it: the runtime stops for permission part-way through the context gate`,
      );
    }
  }
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

// Codex runs a project hook only once its handler is recorded as trusted, so an
// unreviewed .codex/hooks.json leaves the safety policy, the formatter, and the
// docs reminder silently inert. The trust check must stay wired into verify.sh.
assert(
  fs.existsSync(at("scripts/check-codex-hook-trust.mjs")),
  "scripts/check-codex-hook-trust.mjs is missing: without it an untrusted .codex/hooks.json disables every Codex hook with no warning",
);
assert.match(
  read("package.json"),
  /"verify:codex-hooks": "node scripts\/check-codex-hook-trust\.mjs"/,
  "package.json must expose verify:codex-hooks",
);
assert.match(
  read("scripts/verify.sh"),
  /npm run verify:codex-hooks/,
  "scripts/verify.sh must run verify:codex-hooks, or an untrusted Codex hook set goes unnoticed",
);

const sharedMcp = JSON.parse(read(".mcp.json"));
assert.deepEqual(sharedMcp.mcpServers?.playwright, {
  type: "stdio",
  command: "npx",
  args: ["-y", "@playwright/mcp@latest"],
});
// The built-in advisor is enabled by a committed setting and explained at length
// in the README. Nothing tied the two together, so removing the setting and
// leaving the documentation -- or vice versa -- kept the verifier green while the
// README described a configuration the repo no longer had. Assert they agree,
// without asserting which value is right: that is a policy choice, and either
// state passes as long as both places say the same thing.
const claudeSettings = JSON.parse(read(".claude/settings.json"));
const documentedAdvisor = read("README.md").match(
  /^\s*"advisorModel": "([^"]+)"$/m,
)?.[1];
assert.equal(
  claudeSettings.advisorModel,
  documentedAdvisor,
  `.claude/settings.json advisorModel (${claudeSettings.advisorModel ?? "unset"}) must match the value documented in README.md (${documentedAdvisor ?? "none"}): whichever way this is decided, the setting and the documentation have to agree`,
);

const codexConfig = read(".codex/config.toml");
// Assert the exact set of registered Codex agents rather than the absence of
// each retired name. `[agents."worker"]` is valid TOML and slipped straight past
// the old `^\[agents\.worker\]$` denylist; a set comparison catches any
// registration that is not a currently declared role, quoted or not.
const registeredCodexAgents = [
  ...codexConfig.matchAll(/^\[agents\.(?:"([^"]+)"|'([^']+)'|([^\]\s]+))\]/gm),
].map((match) => match[1] ?? match[2] ?? match[3]);
assert.deepEqual(
  [...registeredCodexAgents].sort(),
  [...roleSkills].sort(),
  `.codex/config.toml must register exactly the declared roles (found ${registeredCodexAgents.join(", ") || "none"}): Codex can only spawn what is registered here, so an extra entry -- including a quoted one like [agents."worker"] -- revives a role the repo has retired`,
);
// A `.codex/agents/<role>.toml` file is inert unless config.toml declares the
// role: without the declaration Codex cannot spawn it, so the model and sandbox
// guarantees in the role description simply do not exist on that runtime.
// Verified by A/B test -- undeclared, Codex reports no spawnable roles.
for (const name of roleSkills) {
  assert.match(
    codexConfig,
    new RegExp(
      `^\\[agents\\.${name}\\]\\nconfig_file = "agents/${name}\\.toml"$`,
      "m",
    ),
    `.codex/config.toml must declare [agents.${name}] with config_file = "agents/${name}.toml", or Codex never sees .codex/agents/${name}.toml`,
  );
}

assert.match(codexConfig, /^\[features\]\nhooks = true$/m);
assert.match(codexConfig, /^\[mcp_servers\.playwright\]$/m);
assert.match(codexConfig, /^command = "npx"$/m);
assert.match(codexConfig, /^args = \["-y", "@playwright\/mcp@latest"\]$/m);
assert.match(
  codexConfig,
  /^required = false$/m,
  "Codex must treat Playwright as optional: required = true fails session startup when the MCP server cannot initialise, turning the documented recommendation into a hard prerequisite",
);
assert.doesNotMatch(
  codexConfig,
  /^required = true$/m,
  "no .codex/config.toml MCP server may set required = true",
);

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
      handler.bash.includes(
        "${COPILOT_PROJECT_DIR:-$(git rev-parse --show-toplevel)}",
      ),
    "Copilot hooks must use the documented bash key and resolve from COPILOT_PROJECT_DIR, falling back to the Git root",
  );
}

// Any nested directory proves the hook resolves paths from the Git root rather
// than the working directory. Do not hard-code one an adopter may have deleted.
const nestedProbeDir = ["apps/api", "apps/web", "packages/shared"].find((dir) =>
  fs.existsSync(at(dir)),
);
assert(
  nestedProbeDir,
  "no nested workspace directory found to probe hook path resolution from",
);
const nestedCodexHook = spawnSync(
  commandHandlers(codexHooks).find((handler) =>
    handler.command.includes("pre-tool-use.js"),
  ).command,
  {
    cwd: at(nestedProbeDir),
    shell: POSIX_SHELL,
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
  `Codex hook failed from ${nestedProbeDir}: ${nestedCodexHook.stderr}`,
);

// Copilot loads repo hooks from more than one source, and at least one of them
// starts the hook process outside the repository. `git rev-parse` fails there,
// leaving a bare "/scripts/hooks/pre-tool-use.js" that Node resolves to
// C:\scripts\hooks\pre-tool-use.js and exits 1 — and Copilot hooks are
// fail-closed, so every tool call is denied, including ask_user. Copilot exports
// the workspace root as COPILOT_PROJECT_DIR (COPILOT_WORKSPACE_PATH is unset),
// so prefer it and keep the Git root only as a fallback.
const copilotPreToolUse = commandHandlers(copilotHooks).find((handler) =>
  handler.bash.includes("pre-tool-use.js"),
);
assert.ok(
  copilotPreToolUse,
  "no Copilot preToolUse handler found in .github/hooks/agentic-workflow.json",
);
const foreignCwd = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-hook-cwd-"));
try {
  const foreignHook = spawnSync(copilotPreToolUse.bash, {
    cwd: foreignCwd,
    shell: POSIX_SHELL,
    env: { ...process.env, COPILOT_PROJECT_DIR: root },
    input: JSON.stringify({
      toolName: "bash",
      toolArgs: JSON.stringify({ command: "DROP TABLE users" }),
    }),
    encoding: "utf8",
  });
  assert.equal(
    foreignHook.status,
    0,
    `Copilot PreToolUse hook failed outside the repo: ${foreignHook.stderr}`,
  );
  assert.equal(
    JSON.parse(foreignHook.stdout).permissionDecision,
    "deny",
    "Copilot PreToolUse hook must still enforce policy when Copilot starts it outside the repository",
  );
} finally {
  fs.rmSync(foreignCwd, { recursive: true, force: true });
}

// Fail-closed is what made the original Windows breakage unrecoverable: the hook
// exited non-zero, so Copilot denied *every* tool call — including ask_user — and
// the agent could not even ask for help, let alone repair the hook. When the root
// cannot be resolved at all, ask for confirmation instead of exiting non-zero.
const rootlessCwd = fs.mkdtempSync(
  path.join(os.tmpdir(), "copilot-hook-rootless-"),
);
try {
  const { COPILOT_PROJECT_DIR: _discarded, ...rootlessEnv } = process.env;
  const rootlessHook = spawnSync(copilotPreToolUse.bash, {
    cwd: rootlessCwd,
    shell: POSIX_SHELL,
    env: rootlessEnv,
    input: JSON.stringify({
      toolName: "bash",
      toolArgs: JSON.stringify({ command: "git status" }),
    }),
    encoding: "utf8",
  });
  assert.equal(
    rootlessHook.status,
    0,
    "Copilot PreToolUse hook must fail open, not exit non-zero, when it cannot locate the repository root",
  );
  assert.equal(
    JSON.parse(rootlessHook.stdout).permissionDecision,
    "ask",
    "an unlocatable repository root must surface a confirmation prompt, not a silent approval or a hard deny",
  );
} finally {
  fs.rmSync(rootlessCwd, { recursive: true, force: true });
}

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
      POSIX_SHELL,
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
// Defence in depth, not a fix for an observed gap: Codex currently hands the
// hook `exec_command` with a `cmd` field (verified by A/B test -- the narrower
// pre-existing policy blocks correctly), but its model-facing transcript names
// the tool `exec` and carries the command inside a JavaScript snippet, and its
// own global matcher also lists local_shell, shell_command, and container.exec.
// Codex has reshaped tool payloads before, and a rename here would silently
// disable the policy rather than fail loudly, so these shapes are covered too.
for (const [label, payload] of [
  [
    "exec with a JS snippet",
    {
      tool_name: "exec",
      tool_input: {
        input: 'const r = await tools.exec_command({cmd:"rm -rf /"});',
      },
    },
  ],
  [
    "exec with a raw string payload",
    {
      tool_name: "exec",
      tool_input: 'const r = await tools.exec_command({cmd:"rm -rf /"});',
    },
  ],
  [
    "local_shell with an argv array",
    {
      tool_name: "local_shell",
      tool_input: { command: ["/bin/zsh", "-lc", "rm -rf /"] },
    },
  ],
  [
    "container.exec with an argv array",
    {
      tool_name: "container.exec",
      tool_input: { command: ["bash", "-lc", "rm -rf /"] },
    },
  ],
  [
    "shell_command",
    { tool_name: "shell_command", tool_input: { command: "rm -rf /" } },
  ],
]) {
  assert.equal(
    runPolicy("codex", payload)?.hookSpecificOutput?.permissionDecision,
    "deny",
    `the Codex safety policy must inspect ${label}`,
  );
}
assert.equal(
  runPolicy("codex", {
    tool_name: "exec",
    tool_input: {
      input: 'const r = await tools.exec_command({cmd:"git status"});',
    },
  }),
  null,
  "a safe Codex exec payload must still be allowed",
);
// The Codex PreToolUse matcher must name the tool Codex actually uses.
const codexPreMatchers = codexHooks.hooks.PreToolUse.map(
  (group) => group.matcher ?? "",
).join("|");
assert.match(
  codexPreMatchers,
  /(?<![a-z_])exec(?![a-z_])/,
  "the Codex PreToolUse matcher must include `exec`: matching only exec_command misses the tool name Codex dispatches shell work under, so the policy never runs",
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
  const result = spawnSync(
    POSIX_SHELL,
    [at("scripts/hooks/post-tool-use.sh")],
    {
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
    },
  );
  assert.equal(result.status, 0, `PostToolUse move failed: ${result.stderr}`);
  assert.match(fs.readFileSync(callLog, "utf8"), /prettier --write moved\.js/);

  fs.writeFileSync(path.join(formatterFixture, "styled.ts"), "const y = 2;\n");
  const copilotFormat = spawnSync(
    POSIX_SHELL,
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
    POSIX_SHELL,
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
