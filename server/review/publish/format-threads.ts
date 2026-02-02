import "server-only";

import { FINDING_CATEGORY, SEVERITY, type Finding, type Severity } from "@/server/review/types";

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

function severityRank(severity: Severity): number {
  switch (severity) {
    case SEVERITY.Error:
      return 0;
    case SEVERITY.Warn:
      return 1;
    case SEVERITY.Info:
      return 2;
  }
}

function formatFinding(f: Finding): string {
  const recommendationLine = f.recommendation ? [`  Recommendation: ${f.recommendation}`] : [];

  return [
    `- [${f.severity}/${f.category}] ${f.title}`,
    `  ${f.message}`,
    ...recommendationLine,
    // Stable marker for idempotency per finding.
    `  <!-- pr-reviewer:finding:${f.id} -->`,
  ].join("\n");
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
    const key = normalizeFilePath(f.filePath);
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
  const cap = params.cap ?? DEFAULT_THREAD_CAP;
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
    `PR Reviewer: findings summary`,
    `Repo: ${params.pr.repoName}`,
    `PR: #${params.pr.prId}`,
    `Title: ${params.pr.title}`,
    `Engine: ${params.engineName}`,
    `Total findings: ${params.findings.length}`,
    "",
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

  const maxFileThreads = Math.max(0, cap - 1);
  const selectedFileThreads = fileThreadCandidates.slice(0, maxFileThreads);
  const wasCapped = fileThreadCandidates.length > selectedFileThreads.length;

  for (const t of selectedFileThreads) {
    const marker = threadMarker(`file:${t.filePath}:pr:${params.pr.prId}`);

    const lines: string[] = [
      `File: ${t.filePath}`,
      "",
      ...t.findings.map(formatFinding),
      "",
      marker,
    ];

    threads.push({
      threadMarker: marker,
      filePath: t.filePath,
      content: lines.join("\n"),
      findingIds: t.findings.map((f) => f.id),
    });
  }

  // If we’re capped, add a small note to the summary for transparency.
  if (wasCapped) {
    threads[0] = {
      ...threads[0],
      content:
        `${threads[0].content}\n\n` +
        `Note: thread publishing was capped to ${cap}. Remaining file-scoped findings were not posted.\n` +
        `Category hint: ${FINDING_CATEGORY.Maintainability}\n`,
    };
  }

  return { threads, wasCapped, cap };
}
