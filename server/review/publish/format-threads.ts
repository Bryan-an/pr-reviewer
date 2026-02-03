import "server-only";

import { SEVERITY } from "@/lib/validation/finding";
import type { Severity } from "@/lib/validation/finding";
import type { Finding } from "@/server/review/types";
import { adoBold, adoInlineCode, adoJoinLines } from "@/server/review/publish/ado-markdown";

export type PublishableThread = {
  /**
   * Idempotency marker included in the comment content. Used to detect and skip duplicates.
   */
  threadMarker: string;
  /**
   * File-scoped threads use `filePath` (no line anchoring in v1).
   */
  filePath?: string;
  /**
   * Full comment content to publish.
   */
  content: string;
  /**
   * Findings included in this thread (for reporting/debugging).
   */
  findingIds: string[];
};

export type FormatThreadsResult = {
  threads: PublishableThread[];
  wasCapped: boolean;
  cap: number;
};

const DEFAULT_THREAD_CAP = 50;

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

function severityRank(severity: Severity): number {
  switch (severity) {
    case SEVERITY.Error:
      return 0;
    case SEVERITY.Warn:
      return 1;
    case SEVERITY.Info:
      return 2;
    default:
      return assertNever(severity);
  }
}

function formatFinding(f: Finding): string {
  const severityAndCategory = `[${f.severity}/${f.category}]`;

  const lines: string[] = [
    `- ${adoBold(severityAndCategory)} ${f.title}`,
    `  ${adoBold("Message:")} ${f.message}`,
  ];

  if (f.recommendation) {
    lines.push(`  ${adoBold("Recommendation:")} ${f.recommendation}`);
  }

  // Stable marker for idempotency per finding.
  lines.push(`  <!-- pr-reviewer:finding:${f.id} -->`);

  return adoJoinLines(lines);
}

function threadMarker(marker: string): string {
  return `<!-- pr-reviewer:thread:${marker} -->`;
}

function normalizeFilePath(value: string): string {
  // Azure DevOps expects repo-relative paths; our findings should already be that.
  // Avoid accidental whitespace causing mismatches.
  return value.trim();
}

function groupByFilePath(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();

  for (const f of findings) {
    if (!f.filePath) continue;
    const trimmedFilePath = f.filePath.trim();
    if (trimmedFilePath === "") continue;
    const key = normalizeFilePath(trimmedFilePath);
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }

  return map;
}

function maxSeverity(findings: Finding[]): Severity {
  return findings.reduce<Severity>((best, f) => {
    if (severityRank(f.severity) < severityRank(best)) return f.severity;
    return best;
  }, SEVERITY.Info);
}

function sortFindingsForThread(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity);
    if (bySeverity !== 0) return bySeverity;
    const byCategory = a.category.localeCompare(b.category);
    if (byCategory !== 0) return byCategory;
    return a.title.localeCompare(b.title);
  });
}

export function formatThreads(params: {
  pr: { org: string; project: string; repoName: string; prId: number; title: string };
  engineName: string;
  findings: Finding[];
  cap?: number;
}): FormatThreadsResult {
  const cap = Math.max(1, params.cap ?? DEFAULT_THREAD_CAP);
  const unscopedFindings = params.findings.filter((f) => !f.filePath);
  const fileGroups = groupByFilePath(params.findings);

  const summaryMarker = threadMarker(`summary:pr:${params.pr.prId}`);

  const bySeverity = params.findings.reduce<Record<Severity, number>>(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { info: 0, warn: 0, error: 0 },
  );

  const summaryLines: string[] = [
    adoBold("PR Reviewer: findings summary"),
    "",
    `- ${adoBold("Repo:")} ${params.pr.repoName}`,
    `- ${adoBold("PR:")} #${params.pr.prId}`,
    `- ${adoBold("Title:")} ${params.pr.title}`,
    `- ${adoBold("Engine:")} ${adoInlineCode(params.engineName)}`,
    `- ${adoBold("Total findings:")} ${params.findings.length}`,
    "",
    adoBold("Counts"),
    `- Errors: ${bySeverity.error}`,
    `- Warnings: ${bySeverity.warn}`,
    `- Info: ${bySeverity.info}`,
    "",
    summaryMarker,
  ];

  const threads: PublishableThread[] = [
    {
      threadMarker: summaryMarker,
      content: summaryLines.join("\n"),
      findingIds: [],
    },
  ];

  const generalMarker = threadMarker(`general:pr:${params.pr.prId}`);
  const hasGeneralThread = unscopedFindings.length > 0;

  if (hasGeneralThread && cap >= 2) {
    const sorted = sortFindingsForThread(unscopedFindings);

    threads.push({
      threadMarker: generalMarker,
      content: [
        adoBold("General findings"),
        "",
        sorted.map(formatFinding).join("\n\n"),
        "",
        generalMarker,
      ].join("\n"),
      findingIds: sorted.map((f) => f.id),
    });
  }

  const fileThreadCandidates = [...fileGroups.entries()].map(([filePath, findings]) => {
    const sorted = sortFindingsForThread(findings);
    const max = maxSeverity(findings);

    return {
      filePath,
      findings: sorted,
      maxSeverity: max,
      total: findings.length,
    };
  });

  fileThreadCandidates.sort((a, b) => {
    const byMaxSeverity = severityRank(a.maxSeverity) - severityRank(b.maxSeverity);
    if (byMaxSeverity !== 0) return byMaxSeverity;
    const byCount = b.total - a.total;
    if (byCount !== 0) return byCount;
    return a.filePath.localeCompare(b.filePath);
  });

  const reservedThreads = 1 + (hasGeneralThread && cap >= 2 ? 1 : 0);
  const maxFileThreads = Math.max(0, cap - reservedThreads);
  const selectedFileThreads = fileThreadCandidates.slice(0, maxFileThreads);

  const wasCapped =
    fileThreadCandidates.length > selectedFileThreads.length || (hasGeneralThread && cap < 2);

  for (const t of selectedFileThreads) {
    const marker = threadMarker(`file:${t.filePath}:pr:${params.pr.prId}`);

    threads.push({
      threadMarker: marker,
      filePath: t.filePath,
      content: [
        adoJoinLines([`${adoBold("File:")} ${adoInlineCode(t.filePath)}`]),
        "",
        t.findings.map(formatFinding).join("\n\n"),
        "",
        marker,
      ].join("\n"),
      findingIds: t.findings.map((f) => f.id),
    });
  }

  // If we’re capped, add a small note to the summary for transparency.
  if (wasCapped) {
    threads[0] = {
      ...threads[0],
      content:
        `${threads[0].content}\n\n` +
        `> Note: thread publishing was capped to ${cap}. Some findings may not have been posted.\n`,
    };
  }

  return { threads, wasCapped, cap };
}
