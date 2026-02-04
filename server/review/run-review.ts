import "server-only";

import parseDiff from "parse-diff";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import { FindingSchema } from "@/lib/validation/finding";
import type { Severity } from "@/lib/validation/finding";
import type { ReviewRequest } from "@/lib/validation/review-request";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import { selectReviewEngine } from "@/server/ai/select-engine";
import { ensureRepoCheckedOut, generateUnifiedDiff } from "@/server/git/repo";
import { DomainValidationError, type FindingValidationFailure } from "@/server/review/errors";
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

  const engine = selectReviewEngine();

  const engineResult = await engine.run({
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
  });

  const rawFindings: unknown[] = engineResult.findings as unknown[];

  const findings: Finding[] = [];
  const failures: FindingValidationFailure[] = [];

  for (const [index, item] of rawFindings.entries()) {
    const parsedFinding = FindingSchema.safeParse(item);

    if (!parsedFinding.success) {
      failures.push({ index, item, issues: parsedFinding.error.issues });
      continue;
    }

    findings.push(parsedFinding.data as Finding);
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
    engine: { name: engineResult.engineName },
    summary: {
      totalFindings: findings.length,
      bySeverity: countBySeverity(findings),
    },
    findings,
  };
}
