import "server-only";

import type { GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";

import { reviewRequestSchema } from "@/lib/validation/review-request";
import { createPullRequestThread, listPullRequestThreads } from "@/server/azure-devops/threads";
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

export async function publishReview(params: { prUrl: string }): Promise<PublishReviewResult> {
  const parsed = reviewRequestSchema.safeParse({ prUrl: params.prUrl });

  if (!parsed.success) {
    throw new Error("Invalid input.");
  }

  const review = await runReview(parsed.data);

  const { threads, wasCapped, cap } = formatThreads({
    pr: {
      org: review.pr.org,
      project: review.pr.project,
      repoName: review.pr.repoName,
      prId: review.pr.prId,
      title: review.pr.title,
    },
    engineName: review.engine.name,
    findings: review.findings,
  });

  const existing = await listPullRequestThreads({
    org: review.pr.org,
    project: review.pr.project,
    repoId: review.pr.repoId,
    prId: review.pr.prId,
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
      org: review.pr.org,
      project: review.pr.project,
      repoId: review.pr.repoId,
      prId: review.pr.prId,
      content: t.content,
    };

    try {
      await createPullRequestThread({ ...createParamsBase, filePath: t.filePath });
      publishedThreads += 1;
      existingContents.push(t.content);
    } catch (error) {
      // If file-scoped threads fail (e.g. ADO requires positions), fall back to a general thread.
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
    totalFindings: review.findings.length,
    totalThreads: threads.length,
    publishedThreads,
    skippedThreads,
    wasCapped,
    cap,
  };
}
