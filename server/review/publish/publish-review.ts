import "server-only";

import type { GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import { reviewRequestSchema } from "@/lib/validation/review-request";
import type { Finding } from "@/server/review/types";
import { getLatestIterationContext } from "@/server/azure-devops/iterations";
import { createPullRequestThread, listPullRequestThreads } from "@/server/azure-devops/threads";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import { logger } from "@/server/logging/logger";
import { formatThreads } from "@/server/review/publish/format-threads";
import { runReview } from "@/server/review/run-review";

export type PublishReviewResult = {
  totalFindings: number;
  totalThreads: number;
  publishedThreads: number;
  skippedThreads: number;
  wasCapped: boolean;
  cap: number;
};

function collectExistingCommentContent(threads: GitPullRequestCommentThread[]): string[] {
  const contents: string[] = [];

  for (const thread of threads) {
    for (const comment of thread.comments ?? []) {
      if (typeof comment.content === "string" && comment.content.trim() !== "") {
        contents.push(comment.content);
      }
    }
  }

  return contents;
}

function markerExists(existingContents: string[], marker: string): boolean {
  for (const content of existingContents) {
    if (content.includes(marker)) return true;
  }

  return false;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "Publish failed.";
  return "Publish failed.";
}

function normalizePath(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

export async function publishFindings(params: {
  prUrl: string;
  findings: Finding[];
}): Promise<PublishReviewResult> {
  const parsed = reviewRequestSchema.safeParse({ prUrl: params.prUrl });

  if (!parsed.success) {
    throw new Error("Invalid input.");
  }

  const prUrlParts = parseAzureDevOpsPrUrl(params.prUrl);

  const pr = await fetchPullRequestById({
    org: prUrlParts.org,
    project: prUrlParts.project,
    prId: prUrlParts.prId,
  });

  const { threads, wasCapped, cap } = formatThreads({
    prId: pr.pr.id,
    findings: params.findings,
  });

  // Fetch iteration context for line-anchored threads (best-effort).
  let iterCtx: Awaited<ReturnType<typeof getLatestIterationContext>> | undefined;

  try {
    iterCtx = await getLatestIterationContext({
      org: pr.org,
      project: pr.project,
      repoId: pr.repo.id,
      prId: pr.pr.id,
    });
  } catch (error) {
    logger.warn(
      { err: String(error) },
      "publish:iteration context fetch failed, continuing without",
    );
  }

  const existing = await listPullRequestThreads({
    org: pr.org,
    project: pr.project,
    repoId: pr.repo.id,
    prId: pr.pr.id,
  });

  const existingContents = collectExistingCommentContent(existing);

  let publishedThreads = 0;
  let skippedThreads = 0;

  for (const t of threads) {
    if (markerExists(existingContents, t.threadMarker)) {
      skippedThreads += 1;
      continue;
    }

    const createParamsBase = {
      org: pr.org,
      project: pr.project,
      repoId: pr.repo.id,
      prId: pr.pr.id,
      content: t.content,
    };

    // Resolve iteration context for file-scoped threads.
    const normalizedFilePath = t.filePath ? normalizePath(t.filePath) : undefined;

    const changeTrackingId =
      normalizedFilePath && iterCtx
        ? iterCtx.changeTrackingByPath.get(normalizedFilePath)
        : undefined;

    logger.info(
      {
        filePath: t.filePath,
        normalizedFilePath,
        lineStart: t.lineStart,
        lineEnd: t.lineEnd,
        changeTrackingId,
        iterationContext: iterCtx?.iterationContext,
        hasIterCtx: !!iterCtx,
      },
      "publish:thread context",
    );

    try {
      await createPullRequestThread({
        ...createParamsBase,
        filePath: t.filePath,
        lineStart: t.lineStart,
        lineEnd: t.lineEnd,
        changeTrackingId,
        iterationContext: iterCtx?.iterationContext,
      });

      publishedThreads += 1;
      existingContents.push(t.content);
    } catch (error) {
      logger.warn(
        { filePath: t.filePath, lineStart: t.lineStart, err: String(error) },
        "publish:line-anchored thread failed, falling back to general",
      );

      // If file-scoped threads fail (e.g. ADO rejects positions), fall back to a general thread.
      if (t.filePath) {
        try {
          await createPullRequestThread(createParamsBase);
          publishedThreads += 1;
          existingContents.push(t.content);
          continue;
        } catch (fallbackError) {
          throw new Error(safeErrorMessage(fallbackError));
        }
      }

      throw new Error(safeErrorMessage(error));
    }
  }

  return {
    totalFindings: params.findings.length,
    totalThreads: threads.length,
    publishedThreads,
    skippedThreads,
    wasCapped,
    cap,
  };
}

export async function publishReview(params: { prUrl: string }): Promise<PublishReviewResult> {
  const parsed = reviewRequestSchema.safeParse({ prUrl: params.prUrl });

  if (!parsed.success) {
    throw new Error("Invalid input.");
  }

  const review = await runReview(parsed.data);

  return await publishFindings({
    prUrl: params.prUrl,
    findings: review.findings,
  });
}
