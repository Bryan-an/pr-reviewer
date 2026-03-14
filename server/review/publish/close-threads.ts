import "server-only";

import { closePullRequestThread, listPullRequestThreads } from "@/server/azure-devops/threads";
import { logger } from "@/lib/logging/logger";
import { buildFindingThreadMarker } from "@/server/review/publish/format-threads";

type ThreadCoordinates = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
};

export async function closeSingleThread(
  params: ThreadCoordinates & { adoThreadId: number },
): Promise<void> {
  await closePullRequestThread({
    org: params.org,
    project: params.project,
    repoId: params.repoId,
    prId: params.prId,
    threadId: params.adoThreadId,
  });
}

export async function closeBulkThreadsByMarkers(
  params: ThreadCoordinates & { publishedFindingKeys: string[] },
): Promise<{ closedCount: number; failedCount: number }> {
  const threads = await listPullRequestThreads({
    org: params.org,
    project: params.project,
    repoId: params.repoId,
    prId: params.prId,
  });

  const markerSet = new Set(
    params.publishedFindingKeys.map((key) => buildFindingThreadMarker(key, params.prId)),
  );

  const matchedThreadIds: number[] = [];

  for (const thread of threads) {
    if (thread.id == null) continue;

    for (const comment of thread.comments ?? []) {
      if (typeof comment.content !== "string") continue;

      for (const marker of markerSet) {
        if (comment.content.includes(marker)) {
          matchedThreadIds.push(thread.id);
          break;
        }
      }
    }
  }

  const uniqueThreadIds = [...new Set(matchedThreadIds)];

  if (uniqueThreadIds.length === 0) {
    return { closedCount: 0, failedCount: 0 };
  }

  const results = await Promise.allSettled(
    uniqueThreadIds.map((threadId) =>
      closePullRequestThread({
        org: params.org,
        project: params.project,
        repoId: params.repoId,
        prId: params.prId,
        threadId,
      }),
    ),
  );

  let closedCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      closedCount += 1;
    } else {
      failedCount += 1;
      logger.warn(result.reason, "close-threads:failed to close individual ADO thread");
    }
  }

  return { closedCount, failedCount };
}
