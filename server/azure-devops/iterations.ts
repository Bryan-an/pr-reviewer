import "server-only";

import type { CommentIterationContext } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";
import { logger } from "@/server/logging/logger";

export type PullRequestIterationContext = {
  iterationContext: CommentIterationContext;
  /**
   * Map from normalised file path (no leading `/`) → changeTrackingId.
   */
  changeTrackingByPath: Map<string, number>;
};

function normalizePath(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

/**
 * Fetches the latest PR iteration and builds a map from file paths to their
 * `changeTrackingId` values. This data is required by the Azure DevOps API
 * to anchor comment threads to specific lines in the diff view.
 */
export async function getLatestIterationContext(params: {
  org: string;
  project: string;
  repoId: string;
  prId: number;
}): Promise<PullRequestIterationContext | undefined> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  const iterations = await gitApi.getPullRequestIterations(
    params.repoId,
    params.prId,
    params.project,
  );

  logger.info({ iterationCount: iterations?.length ?? 0 }, "publish:iterations fetched");

  if (!iterations || iterations.length === 0) return undefined;

  const latestIteration = iterations[iterations.length - 1];
  const iterationId = latestIteration.id;

  logger.info({ iterationId }, "publish:latest iteration");

  if (iterationId === undefined) return undefined;

  const iterationContext: CommentIterationContext = {
    firstComparingIteration: 1,
    secondComparingIteration: iterationId,
  };

  const changeTrackingByPath = new Map<string, number>();

  // Paginate through all changes in the iteration.
  let skip = 0;
  const top = 500;

  for (;;) {
    const changes = await gitApi.getPullRequestIterationChanges(
      params.repoId,
      params.prId,
      iterationId,
      params.project,
      top,
      skip,
    );

    for (const entry of changes.changeEntries ?? []) {
      const path = entry.item?.path;
      const trackingId = entry.changeTrackingId;

      logger.debug({ path, trackingId }, "publish:iteration change entry");

      if (path && trackingId !== undefined) {
        changeTrackingByPath.set(normalizePath(path), trackingId);
      }
    }

    if (!changes.nextSkip || !changes.nextTop) break;
    skip = changes.nextSkip;
  }

  logger.info({ paths: [...changeTrackingByPath.keys()] }, "publish:changeTrackingByPath built");

  return { iterationContext, changeTrackingByPath };
}
