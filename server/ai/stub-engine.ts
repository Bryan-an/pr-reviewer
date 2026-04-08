import "server-only";

import type { File, Chunk } from "parse-diff";

import { FINDING_CATEGORY, SEVERITY } from "@/lib/validation/finding";
import type { Severity } from "@/lib/validation/finding";
import type { Finding } from "@/server/review/types";

function stableFindingKey(seed: string): string {
  // Deterministic (not random) and stable across runs.
  return `stub_${Buffer.from(seed).toString("base64url")}`;
}

function countAddedLines(file: File): number {
  const chunks: Chunk[] = file.chunks ?? [];
  let added = 0;

  for (const chunk of chunks) {
    for (const change of chunk.changes ?? []) {
      if (change.type === "add") added += 1;
    }
  }

  return added;
}

function firstTodoLine(file: File): number | undefined {
  const chunks: Chunk[] = file.chunks ?? [];

  for (const chunk of chunks) {
    for (const change of chunk.changes ?? []) {
      if (change.type !== "add") continue;
      if (/TODO\b/i.test(change.content)) return change.ln;
    }
  }

  return undefined;
}

function firstHunkLine(file: File): number | undefined {
  return file.chunks?.[0]?.newStart;
}

export function runStubEngine(parsedDiff: File[]): Finding[] {
  const findings: Finding[] = [];

  const files = [...parsedDiff].sort((a, b) => (a.to ?? "").localeCompare(b.to ?? ""));

  for (const file of files) {
    const filePath = file.to ?? undefined;
    if (!filePath) continue;

    const addedLines = countAddedLines(file);

    if (addedLines >= 300) {
      const hunkLine = firstHunkLine(file);
      findings.push({
        findingKey: stableFindingKey(`large_diff:${filePath}`),
        severity: SEVERITY.Warn,
        category: FINDING_CATEGORY.Maintainability,
        title: "Large change set",
        message: `This file adds ${addedLines} lines. Consider splitting into smaller commits or PRs for easier review.`,
        filePath,
        ...(hunkLine !== undefined ? { lineStart: hunkLine, lineEnd: hunkLine } : {}),
      });
    }

    const todoLine = firstTodoLine(file);
    if (todoLine !== undefined) {
      findings.push({
        findingKey: stableFindingKey(`todo_added:${filePath}`),
        severity: SEVERITY.Info,
        category: FINDING_CATEGORY.DX,
        title: "TODO found in added code",
        message:
          "This file contains a TODO in newly added lines. Ensure it is tracked or resolved before merging.",
        filePath,
        lineStart: todoLine,
        lineEnd: todoLine,
      });
    }

    if (/pnpm-lock\.yaml$/i.test(filePath)) {
      findings.push({
        findingKey: stableFindingKey(`lockfile:${filePath}`),
        severity: SEVERITY.Info,
        category: FINDING_CATEGORY.DX,
        title: "Lockfile updated",
        message:
          "Lockfile changes are expected when dependencies are updated; review for unexpected dependency shifts.",
        filePath,
      });
    }
  }

  const severityRank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };

  return findings.sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return (a.filePath ?? "").localeCompare(b.filePath ?? "") || a.title.localeCompare(b.title);
  });
}
