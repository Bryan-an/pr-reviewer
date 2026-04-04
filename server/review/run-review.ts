import "server-only";

import parseDiff from "parse-diff";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import { FindingSchema } from "@/lib/validation/finding";
import type { Severity } from "@/lib/validation/finding";
import type { ReviewRequest } from "@/lib/validation/review-request";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import { deduplicateFindings } from "@/server/ai/dedup/deduplicate-findings";
import { runEnginesInParallel } from "@/server/ai/run-engines-in-parallel";
import { selectEngineConfig } from "@/server/ai/select-engine";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { ensureRepoCheckedOut, generateUnifiedDiff } from "@/server/git/repo";
import {
  AllEnginesFailedError,
  DomainValidationError,
  EmptyDiffError,
  type FindingValidationFailure,
} from "@/server/review/errors";
import { extractCodeSnippet } from "@/server/review/extract-code-snippet";
import type { Finding, ReviewRunResult } from "@/server/review/types";

function countBySeverity(findings: { severity: Severity }[]): Record<Severity, number> {
  return findings.reduce<Record<Severity, number>>(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { info: 0, warn: 0, error: 0 },
  );
}

export async function runReview(request: ReviewRequest): Promise<ReviewRunResult> {
  const prUrlParts = parseAzureDevOpsPrUrl(request.prUrl);

  // PR URL already includes org + project + repo, but the canonical source for repo remote URL and refs
  // is Azure DevOps PR metadata.
  const pr = await fetchPullRequestById({
    org: prUrlParts.org,
    project: prUrlParts.project,
    prId: prUrlParts.prId,
  });

  // Persist minimal repo metadata for rules mapping (listing remains live via Azure DevOps).
  await upsertRepositoryFromAdoRepo({
    org: pr.org,
    project: pr.project,
    adoRepoId: pr.repo.id,
    name: pr.repo.name,
    remoteUrl: pr.repo.remoteUrl,
  });

  const { repoDir } = await ensureRepoCheckedOut({
    org: pr.org,
    project: pr.project,
    repoId: pr.repo.id,
    remoteUrl: pr.repo.remoteUrl,
  });

  const unifiedDiff = await generateUnifiedDiff({
    repoDir,
    targetRefName: pr.pr.targetRefName,
    sourceRefName: pr.pr.sourceRefName,
  });

  const parsed = parseDiff(unifiedDiff);

  const changedFiles = parsed
    .map((f) => f.to ?? "")
    .map((v) => v.trim())
    .filter((v) => v !== "" && v !== "/dev/null");

  if (changedFiles.length === 0) {
    throw new EmptyDiffError(
      "The PR diff is empty -- source and target branches have no file differences. The review was skipped.",
    );
  }

  // ── Run engines in parallel ──────────────────────────────────────────────
  const { engines, configuredName } = selectEngineConfig();

  const context = {
    request,
    repoDir,
    pr: {
      org: pr.org,
      project: pr.project,
      repoId: pr.repo.id,
      repoName: pr.repo.name,
      prId: pr.pr.id,
      title: pr.pr.title,
      url: pr.pr.url,
      targetRefName: pr.pr.targetRefName,
      sourceRefName: pr.pr.sourceRefName,
    },
    unifiedDiff,
    parsedDiff: parsed,
    changedFiles,
  };

  const outcome = await runEnginesInParallel(engines, context);

  if (
    outcome.findings.length === 0 &&
    outcome.failures.length === engines.length &&
    engines.length > 0
  ) {
    throw new AllEnginesFailedError(outcome.failures);
  }

  // ── Deduplicate cross-engine findings ────────────────────────────────────
  const mergedFindings = await deduplicateFindings({
    findings: outcome.findings,
    cwd: repoDir,
  });

  // ── Validate every finding with Zod ──────────────────────────────────────
  const rawFindings: unknown[] = mergedFindings as unknown[];

  const findings: Finding[] = [];
  const failures: FindingValidationFailure[] = [];

  for (const [index, item] of rawFindings.entries()) {
    const parsedFinding = FindingSchema.safeParse(item);

    if (!parsedFinding.success) {
      failures.push({ index, item, issues: parsedFinding.error.issues });
      continue;
    }

    const f = parsedFinding.data;

    findings.push({
      ...f,
      codeSnippet:
        f.filePath && f.lineStart
          ? extractCodeSnippet(parsed, f.filePath, f.lineStart, f.lineEnd ?? f.lineStart)
          : undefined,
    } as Finding);
  }

  if (failures.length > 0) {
    throw new DomainValidationError(
      `Invalid finding(s) returned by review engine: ${failures.length} of ${rawFindings.length} failed validation.`,
      failures,
    );
  }

  return {
    pr: {
      org: pr.org,
      project: pr.project,
      repoId: pr.repo.id,
      repoName: pr.repo.name,
      prId: pr.pr.id,
      title: pr.pr.title,
      url: pr.pr.url,
    },
    engine: { name: configuredName },
    summary: {
      totalFindings: findings.length,
      bySeverity: countBySeverity(findings),
    },
    findings,
  };
}
