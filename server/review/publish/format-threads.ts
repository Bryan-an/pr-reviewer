import "server-only";

import { SEVERITY } from "@/lib/validation/finding";
import type { Severity } from "@/lib/validation/finding";
import type { Finding } from "@/server/review/types";
import { adoBlockquote, adoBold, adoNormalizeNewlines } from "@/server/review/publish/ado-markdown";

export type PublishableThread = {
  /**
   * Idempotency marker included in the comment content. Used to detect and skip duplicates.
   */
  threadMarker: string;
  /**
   * File path for file-scoped or line-anchored threads.
   */
  filePath?: string;
  /**
   * Start line for line-anchored threads (1-based). Maps to `rightFileStart.line` in Azure DevOps.
   */
  lineStart?: number;
  /**
   * End line for line-anchored threads (1-based). Maps to `rightFileEnd.line` in Azure DevOps.
   */
  lineEnd?: number;
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

  const headerLine = `#### ${adoBold(severityAndCategory)} ${f.title}`;

  const messageLines = adoNormalizeNewlines(f.message);
  const messageBlock = adoBlockquote([`${adoBold("Message:")}`, "", ...messageLines]);

  const recommendationBlock = f.recommendation
    ? adoBlockquote([
        `${adoBold("Recommendation:")}`,
        "",
        ...adoNormalizeNewlines(f.recommendation),
      ])
    : undefined;

  const markerLine = `<!-- pr-reviewer:finding:${f.id} -->`;

  return [
    headerLine,
    "",
    messageBlock,
    ...(recommendationBlock ? ["", recommendationBlock] : []),
    "",
    markerLine,
  ].join("\n");
}

function threadMarker(marker: string): string {
  return `<!-- pr-reviewer:thread:${marker} -->`;
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
  prId: number;
  findings: Finding[];
  cap?: number;
}): FormatThreadsResult {
  const cap = Math.max(1, params.cap ?? DEFAULT_THREAD_CAP);
  const unscopedFindings = params.findings.filter((f) => !f.filePath);
  const scopedFindings = sortFindingsForThread(params.findings.filter((f) => !!f.filePath));

  const threads: PublishableThread[] = [];

  const generalMarker = threadMarker(`general:pr:${params.prId}`);
  const hasGeneralThread = unscopedFindings.length > 0;

  if (hasGeneralThread) {
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

  const reservedThreads = hasGeneralThread ? 1 : 0;
  const maxFindingThreads = Math.max(0, cap - reservedThreads);
  const selectedFindings = scopedFindings.slice(0, maxFindingThreads);

  const wasCapped = scopedFindings.length > selectedFindings.length;

  for (const f of selectedFindings) {
    const marker = threadMarker(`finding:${f.id}:pr:${params.prId}`);

    threads.push({
      threadMarker: marker,
      filePath: f.filePath,
      lineStart: f.lineStart,
      lineEnd: f.lineEnd,
      content: [formatFinding(f), "", marker].join("\n"),
      findingIds: [f.id],
    });
  }

  // If we’re capped, add a note to the first thread for transparency.
  if (wasCapped && threads.length > 0) {
    threads[0] = {
      ...threads[0],
      content:
        `${threads[0].content}\n\n` +
        `> Note: thread publishing was capped to ${cap}. Some findings may not have been posted.\n`,
    };
  }

  return { threads, wasCapped, cap };
}
