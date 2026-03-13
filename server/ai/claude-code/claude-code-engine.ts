import "server-only";

import { createHash } from "node:crypto";

import { REVIEW_ENGINE } from "@/lib/config/env";
import { stripMarkdownFences } from "@/lib/utils/strip-markdown-fences";
import { logger } from "@/lib/logging/logger";
import {
  FINDING_CATEGORY,
  SEVERITY,
  type FindingCategory,
  type Severity,
} from "@/lib/validation/finding";
import type { ReviewEngine } from "@/server/ai/engine";
import { buildSystemPrompt, buildUserPrompt } from "@/server/ai/claude-code/build-review-prompt";
import { runClaudeCodeCli } from "@/server/ai/claude-code/run-claude-code-cli";
import { getRepositoryByUnique } from "@/server/db/repositories";
import { listEnabledRepoRules } from "@/server/db/repo-rules";
import type { Finding } from "@/server/review/types";

// ---------------------------------------------------------------------------
// Stable ID generation — deterministic across runs, prefixed with `cc_`
// ---------------------------------------------------------------------------

function stableId(finding: {
  filePath?: string;
  title: string;
  message: string;
  lineStart?: number;
  lineEnd?: number;
}): string {
  const seed = JSON.stringify({
    filePath: finding.filePath,
    title: finding.title,
    message: finding.message,
    lineStart: finding.lineStart,
    lineEnd: finding.lineEnd,
  });

  return `cc_${createHash("sha256").update(seed).digest("base64url").slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// Normalize raw AI values with fallbacks to valid enum members
// ---------------------------------------------------------------------------

const validSeverities = new Set<string>(Object.values(SEVERITY));
const validCategories = new Set<string>(Object.values(FINDING_CATEGORY));

function normalizeSeverity(value: string | undefined): Severity {
  if (value && validSeverities.has(value)) return value as Severity;
  return SEVERITY.Warn;
}

function normalizeCategory(value: string | undefined): FindingCategory {
  if (value && validCategories.has(value)) return value as FindingCategory;
  return FINDING_CATEGORY.Maintainability;
}

// ---------------------------------------------------------------------------
// JSON extraction — Claude may wrap JSON in markdown fences
// ---------------------------------------------------------------------------

type RawFinding = {
  severity?: string;
  category?: string;
  title?: string;
  message?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
};

function extractJson(text: string): RawFinding[] {
  const stripped = stripMarkdownFences(text);
  const parsed: unknown = JSON.parse(stripped);

  // Accept both { findings: [...] } and bare [...]
  if (Array.isArray(parsed)) return parsed as RawFinding[];

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "findings" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).findings)
  ) {
    return (parsed as Record<string, unknown>).findings as RawFinding[];
  }

  throw new Error("Claude Code output is not a findings array or { findings: [...] } object");
}

// ---------------------------------------------------------------------------
// Engine implementation
// ---------------------------------------------------------------------------

export const claudeCodeEngine: ReviewEngine = {
  async run(context) {
    const repo = await getRepositoryByUnique({
      org: context.pr.org,
      project: context.pr.project,
      adoRepoId: context.pr.repoId,
    });

    const enabledRules = repo ? await listEnabledRepoRules({ repositoryId: repo.id }) : [];

    // Self-gate: no rules → nothing to check
    if (enabledRules.length === 0) {
      logger.info(
        { org: context.pr.org, project: context.pr.project, repoId: context.pr.repoId },
        "Claude Code engine skipped — no enabled rules for repository",
      );

      return { engineName: REVIEW_ENGINE.ClaudeCode, findings: [] };
    }

    const systemPrompt = buildSystemPrompt();

    const userPrompt = buildUserPrompt({
      repoName: context.pr.repoName,
      prId: context.pr.prId,
      title: context.pr.title,
      unifiedDiff: context.unifiedDiff,
      changedFiles: context.changedFiles,
      rules: enabledRules.map((r) => ({ title: r.title, markdown: r.markdown })),
    });

    const { text, costUsd } = await runClaudeCodeCli({
      userPrompt,
      systemPrompt,
      cwd: context.repoDir,
    });

    logger.info({ costUsd, rulesCount: enabledRules.length }, "Claude Code review completed");

    const rawFindings = extractJson(text);

    const findings: Finding[] = rawFindings.map((rf) => ({
      id: stableId({
        filePath: rf.filePath,
        title: rf.title ?? "",
        message: rf.message ?? "",
        lineStart: rf.lineStart,
        lineEnd: rf.lineEnd,
      }),
      severity: normalizeSeverity(rf.severity),
      category: normalizeCategory(rf.category),
      title: rf.title ?? "Untitled finding",
      message: rf.message ?? "",
      filePath: rf.filePath,
      lineStart: rf.lineStart,
      lineEnd: rf.lineEnd,
      recommendation: rf.recommendation,
    }));

    return {
      engineName: REVIEW_ENGINE.ClaudeCode,
      rawOutput: text,
      findings,
    };
  },
};
