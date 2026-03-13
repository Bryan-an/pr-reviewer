import "server-only";

import { randomUUID } from "node:crypto";
import { execa } from "execa";

import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";
import { OUTPUT_LABEL, normalizeText, summarizeOutput } from "@/server/ai/cli-diagnostics";

// ---------------------------------------------------------------------------
// Claude Code NDJSON message types and subtypes
// ---------------------------------------------------------------------------

const NDJSON_TYPE = {
  Result: "result",
} as const;

const RESULT_SUBTYPE = {
  Success: "success",
} as const;

// ---------------------------------------------------------------------------
// NDJSON parsing — Claude Code --output-format json emits one JSON object per
// line. We need the last line with type NDJSON_TYPE.Result.
// ---------------------------------------------------------------------------

type ClaudeCodeResultLine = {
  type: typeof NDJSON_TYPE.Result;
  subtype: string;
  result?: string;
  is_error: boolean;
  total_cost_usd: number;
  num_turns: number;
  errors?: string[];
};

function isResultObject(value: unknown): value is ClaudeCodeResultLine {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as Record<string, unknown>).type === NDJSON_TYPE.Result
  );
}

/**
 * Extracts the result message from Claude Code CLI output.
 *
 * The CLI may output either:
 * - A JSON array: [{...},{...},...,{type:"result",...}]
 * - NDJSON: one JSON object per line
 *
 * We try JSON array first (more common), then fall back to NDJSON line parsing.
 */
function extractResultFromOutput(stdout: string): ClaudeCodeResultLine {
  const trimmed = stdout.trim();

  // ── Try JSON array format ────────────────────────────────────────────────
  if (trimmed.startsWith("[")) {
    try {
      const arr: unknown = JSON.parse(trimmed);

      if (Array.isArray(arr)) {
        // Search from the end — result is typically the last element
        for (let i = arr.length - 1; i >= 0; i--) {
          if (isResultObject(arr[i])) return arr[i];
        }
      }
    } catch {
      // Not a valid JSON array — fall through to NDJSON parsing
    }
  }

  // ── Try NDJSON format (one JSON object per line) ─────────────────────────
  const lines = trimmed.split("\n");

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parsed: unknown = JSON.parse(line);
      if (isResultObject(parsed)) return parsed;
    } catch {
      // Not valid JSON — skip
    }
  }

  throw new Error("Claude Code produced no result line in output");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type RunClaudeCodeCliParams = {
  userPrompt: string;
  systemPrompt: string;
  cwd: string;
  timeoutMs?: number;
};

export async function runClaudeCodeCli(params: RunClaudeCodeCliParams): Promise<{
  text: string;
  costUsd: number;
}> {
  const env = getEnv();
  const bin = env.CLAUDE_CODE_BIN ?? "claude";
  const timeoutMs = params.timeoutMs ?? env.CLAUDE_CODE_TIMEOUT_MS ?? 5 * 60_000;

  const args = [
    "-p",
    "--output-format",
    "json",
    "--max-turns",
    "1",
    "--system-prompt",
    params.systemPrompt,
  ];

  const child = execa(bin, args, {
    cwd: params.cwd,
    input: params.userPrompt,
    reject: false,
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    env: {
      // Unset CLAUDECODE to avoid nested-session detection when invoked
      // from within a Claude Code session during development.
      CLAUDECODE: undefined,
    },
  });

  const result = await child;

  if (result.timedOut) {
    const correlationId = randomUUID();
    const stderr = normalizeText(result.stderr);
    const stdout = normalizeText(result.stdout);
    const stderrSummary = summarizeOutput(stderr, OUTPUT_LABEL.Stderr);
    const stdoutSummary = summarizeOutput(stdout, OUTPUT_LABEL.Stdout);

    logger.error(
      {
        correlationId,
        timedOut: true,
        timeoutMs,
        exitCode: result.exitCode,
        stdout: stdoutSummary,
        stderr: stderrSummary,
      },
      "Claude Code CLI timed out",
    );

    throw new Error(
      `Claude Code CLI timed out after ${timeoutMs}ms (correlationId=${correlationId}).`,
    );
  }

  if (typeof result.exitCode !== "number" || result.exitCode !== 0) {
    const correlationId = randomUUID();

    const exitDescription =
      typeof result.exitCode === "number" ? `exit ${result.exitCode}` : "unknown exit code";

    const stderr = normalizeText(result.stderr);
    const stdout = normalizeText(result.stdout);
    const stderrSummary = summarizeOutput(stderr, OUTPUT_LABEL.Stderr);
    const stdoutSummary = summarizeOutput(stdout, OUTPUT_LABEL.Stdout);

    logger.error(
      {
        correlationId,
        timedOut: false,
        exitCode: result.exitCode,
        stdout: stdoutSummary,
        stderr: stderrSummary,
      },
      "Claude Code CLI failed",
    );

    throw new Error(`Claude Code CLI failed (${exitDescription}, correlationId=${correlationId}).`);
  }

  const stdout = normalizeText(result.stdout);
  const stderr = normalizeText(result.stderr);

  // Try stdout first, then stderr — some Claude CLI configurations may
  // write NDJSON to stderr or mix the streams.
  let resultLine: ClaudeCodeResultLine;

  try {
    resultLine = extractResultFromOutput(stdout);
  } catch {
    try {
      resultLine = extractResultFromOutput(stderr);
    } catch {
      const correlationId = randomUUID();

      logger.error(
        {
          correlationId,
          exitCode: result.exitCode,
          stdout: summarizeOutput(stdout, OUTPUT_LABEL.Stdout),
          stderr: summarizeOutput(stderr, OUTPUT_LABEL.Stderr),
        },
        "Claude Code CLI produced no NDJSON result line",
      );

      throw new Error(
        `Claude Code produced no result line in output (correlationId=${correlationId}). ` +
          `stdout length=${stdout.length}, stderr length=${stderr.length}.`,
      );
    }
  }

  if (resultLine.subtype !== RESULT_SUBTYPE.Success || !resultLine.result) {
    const errorMsg = resultLine.errors?.join("; ") ?? "unknown error";

    throw new Error(
      `Claude Code CLI returned non-success result: ${resultLine.subtype} — ${errorMsg}`,
    );
  }

  return {
    text: resultLine.result,
    costUsd: resultLine.total_cost_usd,
  };
}
