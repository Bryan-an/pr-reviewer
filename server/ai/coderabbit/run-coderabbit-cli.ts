import "server-only";

import { randomUUID } from "node:crypto";
import { execa } from "execa";

import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";
import { OUTPUT_LABEL, normalizeText, summarizeOutput } from "@/server/ai/cli-diagnostics";

export type RunCodeRabbitCliParams = {
  cwd: string;
  baseBranch: string;
  configFiles?: string[];
  timeoutMs?: number;
};

export async function runCodeRabbitCli(params: RunCodeRabbitCliParams): Promise<{
  stdout: string;
  stderr: string;
}> {
  const env = getEnv();
  const bin = env.CODERABBIT_BIN ?? "coderabbit";
  const timeoutMs = params.timeoutMs ?? env.CODERABBIT_TIMEOUT_MS ?? 10 * 60_000;

  const configFiles = (params.configFiles ?? []).map((v) => v.trim()).filter(Boolean);

  // CodeRabbit CLI supports multiple output formats; we use `--plain` for a stable-ish
  // text output that we can best-effort parse into deterministic findings.
  const args = [
    "--plain",
    "--type",
    "committed",
    "--base",
    params.baseBranch,
    ...(configFiles.length > 0 ? ["--config", ...configFiles] : []),
    "--no-color",
  ];

  const child = execa(bin, args, {
    cwd: params.cwd,
    reject: false,
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
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
    const stderrSummary = summarizeOutput(stderr, OUTPUT_LABEL.Stderr);
    const stdoutSummary = summarizeOutput(stdout, OUTPUT_LABEL.Stdout);

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
