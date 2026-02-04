import "server-only";

import { execa } from "execa";

import { getEnv } from "@/lib/config/env";

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
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const message = `CodeRabbit CLI timed out after ${timeoutMs}ms.`;
    const combined = [message, stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
    throw new Error(combined);
  }

  // Exit codes are not documented clearly for all failure modes (auth, rate limit, etc),
  // so treat any non-zero as an error, but include output to aid diagnosis upstream.
  if (typeof result.exitCode !== "number" || result.exitCode !== 0) {
    const exitDescription =
      typeof result.exitCode === "number" ? `exit ${result.exitCode}` : "unknown exit code";

    const message = `CodeRabbit CLI failed (${exitDescription}).`;
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const combined = [message, stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
    throw new Error(combined);
  }

  return {
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  };
}
