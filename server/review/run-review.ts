import "server-only";

import parseDiff from "parse-diff";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import type { ReviewRequest } from "@/lib/validation/review-request";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import { runStubEngine } from "@/server/ai/stub-engine";
import { ensureRepoCheckedOut, generateUnifiedDiff } from "@/server/git/repo";
import type { ReviewRunResult, Severity } from "@/server/review/types";

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
  const findings = runStubEngine(parsed);

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
    engine: { name: "stub" },
    summary: {
      totalFindings: findings.length,
      bySeverity: countBySeverity(findings),
    },
    findings,
  };
}
