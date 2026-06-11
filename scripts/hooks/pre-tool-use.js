#!/usr/bin/env node
/**
 * PreToolUse hook — deterministic pattern matching to block catastrophic actions.
 *
 * No LLM judgement. Just regex against known dangerous patterns.
 * Receives JSON on stdin with tool_name and tool_input.
 * Outputs JSON with decision: "approve", "block", or "ask" (requires user confirmation).
 */

function checkBashCommand(command) {
  // Block recursive delete on sensitive paths
  if (/rm\s+(-rf|-fr)\s+[/~.*]/.test(command)) {
    return {
      decision: "block",
      reason: "BLOCKED: Recursive delete on sensitive path. Review manually.",
    };
  }

  // Block force push to protected branches
  if (
    /git\s+push\s+.*--force/.test(command) ||
    /git\s+push\s+-f\b/.test(command)
  ) {
    if (/\b(main|master|staging|production)\b/.test(command)) {
      return {
        decision: "block",
        reason: "BLOCKED: Force push to protected branch.",
      };
    }
    return {
      decision: "ask",
      reason: "Force push detected. Confirm this is intentional.",
    };
  }

  // Ask before --no-verify (surfaces a confirmation dialog rather than hard-blocking)
  if (/--no-verify/.test(command)) {
    return {
      decision: "ask",
      reason:
        "--no-verify bypasses hooks. Confirm this has explicit approval before proceeding.",
    };
  }

  // Ask before git reset --hard
  if (/git\s+reset\s+--hard/.test(command)) {
    return {
      decision: "ask",
      reason:
        "git reset --hard will discard uncommitted changes. Confirm this is intentional.",
    };
  }

  // Block db:push without migration (Prisma or similar)
  if (/db:push|db\s+push/.test(command)) {
    return {
      decision: "block",
      reason:
        "BLOCKED: Use migrations (db:migrate), not db:push. Schema changes require migration files.",
    };
  }

  // Block dropping tables
  if (/DROP\s+(TABLE|DATABASE|SCHEMA)/i.test(command)) {
    return {
      decision: "block",
      reason:
        "BLOCKED: DROP statement detected. This is destructive and irreversible.",
    };
  }

  // Ask before deleting git branches with -D (force delete)
  if (/git\s+branch\s+-D/.test(command)) {
    return {
      decision: "ask",
      reason: "Force-deleting a branch. Confirm this is intentional.",
    };
  }

  // Block npm/npx with sudo
  if (/sudo\s+(npm|npx)/.test(command)) {
    return {
      decision: "block",
      reason: "BLOCKED: Never run npm/npx with sudo.",
    };
  }

  return null;
}

function checkWriteOrEdit(filePath) {
  // Ask before writing to .env files (secrets risk)
  if (/\.env($|\.)/.test(filePath)) {
    return {
      decision: "ask",
      reason: `Writing to env file: ${filePath}. Confirm this won't contain secrets.`,
    };
  }

  // Ask before writing to CI/CD pipeline files
  if (/\.(github|gitlab).*\.(yml|yaml)$/.test(filePath)) {
    return {
      decision: "ask",
      reason: `Modifying CI/CD pipeline: ${filePath}. Confirm this is intentional.`,
    };
  }

  return null;
}

function main() {
  let inputData = "";

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    inputData += chunk;
  });

  process.stdin.on("end", () => {
    let parsed;
    try {
      parsed = JSON.parse(inputData);
    } catch {
      process.exit(0);
    }

    const toolName = parsed.tool_name || "";
    const toolInput = parsed.tool_input || {};

    let result = null;

    if (toolName === "Bash") {
      result = checkBashCommand(toolInput.command || "");
    } else if (toolName === "Write" || toolName === "Edit") {
      result = checkWriteOrEdit(toolInput.file_path || "");
    }

    if (result) {
      process.stdout.write(JSON.stringify(result));
    }
    // No output = approve (implicit)
  });
}

main();
