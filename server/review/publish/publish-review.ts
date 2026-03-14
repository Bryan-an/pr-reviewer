import "server-only";

import type { GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";

import { parseAzureDevOpsPrUrl } from "@/lib/azure-devops/pr-url";
import { reviewRequestSchema } from "@/lib/validation/review-request";
import type { Finding } from "@/server/review/types";
import { getLatestIterationContext } from "@/server/azure-devops/iterations";
import {
  createPullRequestThread,
  listPullRequestThreads,
  reopenPullRequestThread,
} from "@/server/azure-devops/threads";
import { CommentThreadStatus } from "azure-devops-node-api/interfaces/GitInterfaces";
import { fetchPullRequestById } from "@/server/azure-devops/pull-requests";
import { logger } from "@/lib/logging/logger";
import { updateFindingAdoThreadId } from "@/server/db/findings";
import { formatThreads } from "@/server/review/publish/format-threads";
import { runReview } from "@/server/review/run-review";

export type ProcessedFinding = {
  findingId: string;
  adoThreadId: number | undefined;
};

export type PublishReviewResult = {
  totalFindings: number;
  totalThreads: number;
  publishedThreads: number;
  skippedThreads: number;
  wasCapped: boolean;
  cap: number;
  /** Findings whose threads were published or already existed on ADO. */
  processedFindings: ProcessedFinding[];
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

type ExistingThreadMatch = {
  threadId: number;
  isClosed: boolean;
};

function findExistingThread(
  existingThreads: GitPullRequestCommentThread[],
  marker: string,
): ExistingThreadMatch | undefined {
  for (const thread of existingThreads) {
    for (const comment of thread.comments ?? []) {
      if (typeof comment.content === "string" && comment.content.includes(marker)) {
        if (thread.id == null) return undefined;

        return {
          threadId: thread.id,
          isClosed: thread.status === CommentThreadStatus.Closed,
        };
      }
    }
  }

  return undefined;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "Publish failed.";
  return "Publish failed.";
}

function normalizePath(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

async function persistThreadId(
  adoThreadId: number | undefined,
  findingIds: string[],
  findings: Finding[],
  processedFindings: ProcessedFinding[],
): Promise<void> {
  for (const fid of findingIds) {
    processedFindings.push({ findingId: fid, adoThreadId });
  }

  if (adoThreadId == null) return;

  const results = await Promise.allSettled(
    findingIds.map((fid) => {
      const f = findings.find((pf) => pf.id === fid);
      if (!f?.dbId) return Promise.resolve();
      return updateFindingAdoThreadId(f.dbId, adoThreadId);
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn(result.reason, "publish:failed to persist ADO thread ID (non-fatal)");
    }
  }
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
  const processedFindings: ProcessedFinding[] = [];

  for (const t of threads) {
    if (markerExists(existingContents, t.threadMarker)) {
      const match = findExistingThread(existing, t.threadMarker);

      // Reopen closed threads (e.g., previously restored findings being re-published).
      if (match?.isClosed) {
        try {
          await reopenPullRequestThread({
            org: pr.org,
            project: pr.project,
            repoId: pr.repo.id,
            prId: pr.pr.id,
            threadId: match.threadId,
          });

          publishedThreads += 1;
        } catch (err) {
          logger.warn(err, "publish:failed to reopen closed ADO thread (non-fatal)");
          skippedThreads += 1;
        }
      } else {
        skippedThreads += 1;
      }

      await persistThreadId(match?.threadId, t.findingIds, params.findings, processedFindings);
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
      const createdThread = await createPullRequestThread({
        ...createParamsBase,
        filePath: t.filePath,
        lineStart: t.lineStart,
        lineEnd: t.lineEnd,
        changeTrackingId,
        iterationContext: iterCtx?.iterationContext,
      });

      publishedThreads += 1;
      existingContents.push(t.content);
      await persistThreadId(createdThread.id, t.findingIds, params.findings, processedFindings);
    } catch (error) {
      logger.warn(
        { filePath: t.filePath, lineStart: t.lineStart, err: String(error) },
        "publish:line-anchored thread failed, falling back to general",
      );

      // If file-scoped threads fail (e.g. ADO rejects positions), fall back to a general thread.
      if (t.filePath) {
        try {
          const fallbackThread = await createPullRequestThread(createParamsBase);
          publishedThreads += 1;
          existingContents.push(t.content);

          await persistThreadId(
            fallbackThread.id,
            t.findingIds,
            params.findings,
            processedFindings,
          );

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
    processedFindings,
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
