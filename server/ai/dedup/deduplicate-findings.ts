import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logging/logger";
import { stripMarkdownFences } from "@/lib/utils/strip-markdown-fences";
import { runClaudeCodeCli } from "@/server/ai/claude-code/run-claude-code-cli";
import type { Finding } from "@/server/review/types";

// ---------------------------------------------------------------------------
// Dedup response schema — Claude returns the IDs of findings to keep
// ---------------------------------------------------------------------------

const dedupResponseSchema = z.object({
  keep: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const DEDUP_SYSTEM_PROMPT = `You are a deduplication assistant for code review findings.

You receive a JSON array of findings from multiple review engines. Some findings may be near-duplicates — they refer to the same issue in the same file at the same (or overlapping) location, even if worded differently.

## Response format

Respond ONLY with a JSON object: { "keep": ["id1", "id2", ...] }

The "keep" array contains the IDs of findings to retain. For each group of near-duplicates, keep only the finding with the most detailed explanation. Include all findings that are NOT duplicates.

No prose, no markdown fences, no explanation. Just the JSON object.`;

function buildDedupUserPrompt(findings: Finding[]): string {
  const compact = findings.map((f) => ({
    id: f.id,
    sourceName: f.sourceName,
    severity: f.severity,
    category: f.category,
    title: f.title,
    message: f.message.slice(0, 500),
    filePath: f.filePath,
    lineStart: f.lineStart,
    lineEnd: f.lineEnd,
  }));

  return JSON.stringify(compact, null, 2);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEDUP_TIMEOUT_MS = 2 * 60_000;

/**
 * Uses Claude to identify and remove near-duplicate findings from multiple
 * engines. This is a best-effort post-processing step — on any failure,
 * the original findings are returned unchanged.
 *
 * Skips deduplication when all findings come from a single engine (no
 * cross-engine duplicates possible).
 */
export async function deduplicateFindings(params: {
  findings: Finding[];
  cwd: string;
}): Promise<Finding[]> {
  const { findings, cwd } = params;

  // Skip if fewer than 2 distinct engines produced findings
  const distinctSources = new Set(findings.map((f) => f.sourceName).filter(Boolean));

  if (distinctSources.size < 2) {
    return findings;
  }

  try {
    const { text } = await runClaudeCodeCli({
      userPrompt: buildDedupUserPrompt(findings),
      systemPrompt: DEDUP_SYSTEM_PROMPT,
      cwd,
      timeoutMs: DEDUP_TIMEOUT_MS,
    });

    const stripped = stripMarkdownFences(text);

    const parsed = dedupResponseSchema.parse(JSON.parse(stripped));
    const validIds = new Set(findings.map((f) => f.id));
    const keepSet = new Set(parsed.keep.filter((id) => validIds.has(id)));

    // Guard: if keep resolved to empty but we had findings, the AI
    // hallucinated or returned garbage — fall back to all findings.
    if (keepSet.size === 0 && findings.length > 0) {
      logger.warn(
        { totalFindings: findings.length, rawKeepCount: parsed.keep.length },
        "Dedup returned no valid IDs — returning all findings unchanged",
      );

      return findings;
    }

    const deduped = findings.filter((f) => keepSet.has(f.id));
    const removed = findings.length - deduped.length;

    if (removed > 0) {
      logger.info(
        { totalFindings: findings.length, kept: deduped.length, removed },
        "Deduplicated findings across engines",
      );
    }

    return deduped;
  } catch (err) {
    logger.warn(err, "Finding deduplication failed — returning all findings unchanged");
    return findings;
  }
}
