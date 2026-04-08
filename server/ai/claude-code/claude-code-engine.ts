import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { REVIEW_ENGINE } from "@/lib/validation/review-engine-name";
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

function stableFindingKey(finding: {
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
// Zod schema for raw AI output — coerces types and applies safe defaults
// ---------------------------------------------------------------------------

const severityValues = Object.values(SEVERITY) as [Severity, ...Severity[]];
const categoryValues = Object.values(FINDING_CATEGORY) as [FindingCategory, ...FindingCategory[]];

const rawFindingSchema = z.object({
  severity: z
    .string()
    .optional()
    .transform(
      (v): Severity =>
        v && (severityValues as string[]).includes(v) ? (v as Severity) : SEVERITY.Warn,
    ),
  category: z
    .string()
    .optional()
    .transform(
      (v): FindingCategory =>
        v && (categoryValues as string[]).includes(v)
          ? (v as FindingCategory)
          : FINDING_CATEGORY.Maintainability,
    ),
  title: z.string().optional().default("Untitled finding"),
  message: z.string().optional().default(""),
  filePath: z.string().optional(),
  lineStart: z.coerce.number().int().positive().optional().catch(undefined),
  lineEnd: z.coerce.number().int().positive().optional().catch(undefined),
  recommendation: z.string().optional(),
});

type RawFinding = z.infer<typeof rawFindingSchema>;

// ---------------------------------------------------------------------------
// JSON extraction + validation — Claude may wrap JSON in markdown fences
// ---------------------------------------------------------------------------

function extractFindings(text: string): RawFinding[] {
  const stripped = stripMarkdownFences(text);
  const parsed: unknown = JSON.parse(stripped);

  // Accept both { findings: [...] } and bare [...]
  let items: unknown[];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    typeof parsed === "object" &&
    parsed !== null &&
    "findings" in parsed &&
    Array.isArray((parsed as Record<string, unknown>).findings)
  ) {
    items = (parsed as Record<string, unknown>).findings as unknown[];
  } else {
    throw new Error("Claude Code output is not a findings array or { findings: [...] } object");
  }

  const findings: RawFinding[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = rawFindingSchema.safeParse(items[i]);

    if (result.success) {
      findings.push(result.data);
    } else {
      logger.warn(
        { index: i, errors: z.treeifyError(result.error) },
        "Dropped malformed finding from Claude Code output",
      );
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Verify-first preamble — prepended to every recommendation so reviewers
// check the code before assuming the finding is correct.
// ---------------------------------------------------------------------------

const VERIFY_PREAMBLE = "Verify each finding against the current code and only fix it if needed.";

function prependVerifyPreamble(recommendation: string | undefined): string | undefined {
  if (!recommendation) return recommendation;
  return `${VERIFY_PREAMBLE}\n\n${recommendation}`;
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

    const rawFindings = extractFindings(text);

    const findings: Finding[] = rawFindings.map((rf) => ({
      findingKey: stableFindingKey({
        filePath: rf.filePath,
        title: rf.title,
        message: rf.message,
        lineStart: rf.lineStart,
        lineEnd: rf.lineEnd,
      }),
      severity: rf.severity,
      category: rf.category,
      title: rf.title,
      message: rf.message,
      filePath: rf.filePath,
      lineStart: rf.lineStart,
      lineEnd: rf.lineEnd,
      recommendation: prependVerifyPreamble(rf.recommendation),
    }));

    return {
      engineName: REVIEW_ENGINE.ClaudeCode,
      rawOutput: text,
      findings,
    };
  },
};
