import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { execa } from "execa";

import { getEnv } from "@/lib/config/env";
import { logger } from "@/server/logging/logger";

const MAX_ERROR_OUTPUT_CHARS = 1024;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function summarizeOutput(
  output: string,
  label: "stdout" | "stderr",
): {
  label: "stdout" | "stderr";
  length: number;
  sha256: string;
  truncated: string;
} {
  const trimmed = output.trim();

  const truncated =
    trimmed.length > MAX_ERROR_OUTPUT_CHARS
      ? `${trimmed.slice(0, MAX_ERROR_OUTPUT_CHARS)}...[truncated]`
      : trimmed;

  return {
    label,
    length: trimmed.length,
    sha256: sha256Hex(trimmed),
    truncated,
  };
}

export type RunCodeRabbitCliParams = {
  cwd: string;
  baseBranch: string;
  timeoutMs?: number;
};

export async function runCodeRabbitCli(params: RunCodeRabbitCliParams): Promise<{
  stdout: string;
  stderr: string;
}> {
  const env = getEnv();
  const bin = env.CODERABBIT_BIN ?? "coderabbit";
  const timeoutMs = params.timeoutMs ?? env.CODERABBIT_TIMEOUT_MS ?? 10 * 60_000;

  // CodeRabbit CLI supports multiple output formats; we use `--plain` for a stable-ish
  // text output that we can best-effort parse into deterministic findings.
  const child = execa(
    bin,
    ["--plain", "--type", "committed", "--base", params.baseBranch, "--no-color"],
    {
      cwd: params.cwd,
      reject: false,
      maxBuffer: 20 * 1024 * 1024,
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    },
  );

  const result = await child;

  if (result.timedOut) {
    const correlationId = randomUUID();
    const stderr = normalizeText(result.stderr);
    const stdout = normalizeText(result.stdout);
    const stderrSummary = summarizeOutput(stderr, "stderr");
    const stdoutSummary = summarizeOutput(stdout, "stdout");

    logger.error(
      {
        correlationId,
        timedOut: true,
        timeoutMs,
        exitCode: result.exitCode,
        stdout,
        stderr,
      },
      "CodeRabbit CLI timed out",
    );

    const message = `CodeRabbit CLI timed out after ${timeoutMs}ms (correlationId=${correlationId}).`;

    const combined = [
      message,
      `stderr(len=${stderrSummary.length}, sha256=${stderrSummary.sha256})`,
      stderrSummary.truncated,
      `stdout(len=${stdoutSummary.length}, sha256=${stdoutSummary.sha256})`,
      stdoutSummary.truncated,
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(combined);
  }

  // Exit codes are not documented clearly for all failure modes (auth, rate limit, etc),
  // so treat any non-zero as an error, but include output to aid diagnosis upstream.
  if (typeof result.exitCode !== "number" || result.exitCode !== 0) {
    const correlationId = randomUUID();

    const exitDescription =
      typeof result.exitCode === "number" ? `exit ${result.exitCode}` : "unknown exit code";

    const stderr = normalizeText(result.stderr);
    const stdout = normalizeText(result.stdout);
    const stderrSummary = summarizeOutput(stderr, "stderr");
    const stdoutSummary = summarizeOutput(stdout, "stdout");

    logger.error(
      {
        correlationId,
        timedOut: false,
        exitCode: result.exitCode,
        stdout,
        stderr,
      },
      "CodeRabbit CLI failed",
    );

    const message = `CodeRabbit CLI failed (${exitDescription}, correlationId=${correlationId}).`;

    const combined = [
      message,
      `stderr(len=${stderrSummary.length}, sha256=${stderrSummary.sha256})`,
      stderrSummary.truncated,
      `stdout(len=${stdoutSummary.length}, sha256=${stdoutSummary.sha256})`,
      stdoutSummary.truncated,
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(combined);
  }

  return {
    stdout: normalizeText(result.stdout),
    stderr: normalizeText(result.stderr),
  };
}
