import "server-only";

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Output label constants — used by CLI runners for structured error logging
// ---------------------------------------------------------------------------

export const OUTPUT_LABEL = {
  Stdout: "stdout",
  Stderr: "stderr",
} as const;

export type OutputLabel = (typeof OUTPUT_LABEL)[keyof typeof OUTPUT_LABEL];

// ---------------------------------------------------------------------------
// Shared utilities for CLI output diagnostics
// ---------------------------------------------------------------------------

const MAX_ERROR_OUTPUT_CHARS = 1024;

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type OutputSummary = {
  label: OutputLabel;
  length: number;
  sha256: string;
  truncated: string;
};

export function summarizeOutput(output: string, label: OutputLabel): OutputSummary {
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
