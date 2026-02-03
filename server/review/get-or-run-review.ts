import "server-only";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import type { ReviewRequest } from "@/lib/validation/review-request";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import {
  createReviewRun,
  getLatestReviewRunByPrUrl,
  getReviewRunById,
} from "@/server/db/review-runs";
import { ensureRepoCheckedOut } from "@/server/git/repo";
import { resolveBaseAndHeadShas } from "@/server/git/shas";
import { runReview } from "@/server/review/run-review";
import type { ReviewRunResult } from "@/server/review/types";

export async function getCachedReviewRun(params: { prUrl: string; runId?: string }): Promise<{
  runId: string;
  result: ReviewRunResult;
} | null> {
  if (params.runId) {
    const byId = await getReviewRunById(params.runId);
    if (byId) return { runId: byId.runId, result: byId.result };
  }

  return await getLatestReviewRunByPrUrl(params.prUrl);
}

export async function runAndPersistReview(params: ReviewRequest): Promise<{
  runId: string;
  result: ReviewRunResult;
}> {
  const prUrlParts = parseAzureDevOpsPrUrl(params.prUrl);

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

  const { baseSha, headSha } = await resolveBaseAndHeadShas({
    repoDir,
    targetRefName: pr.pr.targetRefName,
    sourceRefName: pr.pr.sourceRefName,
  });

  const review = await runReview(params);

  const { runId } = await createReviewRun({
    prUrl: params.prUrl,
    pr: {
      ...review.pr,
      sourceRefName: pr.pr.sourceRefName,
      targetRefName: pr.pr.targetRefName,
    },
    baseSha,
    headSha,
    engineName: review.engine.name,
    findings: review.findings,
  });

  return { runId, result: review };
}
