import "server-only";

import type {
  Comment,
  CommentIterationContext,
  CommentThreadContext,
  GitPullRequestCommentThread,
  GitPullRequestCommentThreadContext,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import { CommentThreadStatus, CommentType } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";
import { logger } from "@/lib/logging/logger";

export type CreatePullRequestThreadParams = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
  content: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  changeTrackingId?: number;
  iterationContext?: CommentIterationContext;
};

export type ListPullRequestThreadsParams = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
};

function ensureLeadingSlash(filePath: string): string {
  return filePath.startsWith("/") ? filePath : `/${filePath}`;
}

/**
 * Maximum offset value for Azure DevOps `CommentPosition.offset`.
 * The API defines offset as `integer (int32)` — max 2,147,483,647.
 * Using int32 max to represent "end of line" without exceeding the API limit.
 */
const INT32_MAX = 2_147_483_647;

function buildThread(params: {
  content: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  changeTrackingId?: number;
  iterationContext?: CommentIterationContext;
}): GitPullRequestCommentThread {
  const comments: Comment[] = [
    {
      commentType: CommentType.Text,
      content: params.content,
    },
  ];

  const adoFilePath = params.filePath ? ensureLeadingSlash(params.filePath) : undefined;

  const threadContext: CommentThreadContext | undefined = adoFilePath
    ? {
        filePath: adoFilePath,
        ...(params.lineStart !== undefined
          ? {
              rightFileStart: { line: params.lineStart, offset: 1 },
              rightFileEnd: {
                line: params.lineEnd ?? params.lineStart,
                offset: INT32_MAX,
              },
            }
          : {}),
      }
    : undefined;

  const pullRequestThreadContext: GitPullRequestCommentThreadContext | undefined =
    params.changeTrackingId !== undefined && params.iterationContext
      ? {
          changeTrackingId: params.changeTrackingId,
          iterationContext: params.iterationContext,
        }
      : undefined;

  return {
    status: CommentThreadStatus.Active,
    comments,
    threadContext,
    pullRequestThreadContext,
  };
}

export async function createPullRequestThread(
  params: CreatePullRequestThreadParams,
): Promise<GitPullRequestCommentThread> {
  try {
    const webApi = createAzureDevOpsClient(params.org);
    const gitApi = await webApi.getGitApi();

    const thread = buildThread({
      content: params.content,
      filePath: params.filePath,
      lineStart: params.lineStart,
      lineEnd: params.lineEnd,
      changeTrackingId: params.changeTrackingId,
      iterationContext: params.iterationContext,
    });

    logger.info(
      {
        threadContext: thread.threadContext,
        pullRequestThreadContext: thread.pullRequestThreadContext,
      },
      "publish:thread object being sent to ADO",
    );

    const result = await gitApi.createThread(thread, params.repoId, params.prId, params.project);

    logger.info(
      {
        id: result.id,
        threadContext: result.threadContext,
        pullRequestThreadContext: result.pullRequestThreadContext,
      },
      "publish:ADO response",
    );

    return result;
  } catch (err) {
    logger.error(err, "Failed to create Azure DevOps PR thread");
    throw err;
  }
}

export type ClosePullRequestThreadParams = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
  threadId: number;
};

export async function closePullRequestThread(params: ClosePullRequestThreadParams): Promise<void> {
  try {
    const webApi = createAzureDevOpsClient(params.org);
    const gitApi = await webApi.getGitApi();

    await gitApi.updateThread(
      { status: CommentThreadStatus.Closed },
      params.repoId,
      params.prId,
      params.threadId,
      params.project,
    );
  } catch (err) {
    logger.error(err, "Failed to close Azure DevOps PR thread");
    throw err;
  }
}

export async function reopenPullRequestThread(params: ClosePullRequestThreadParams): Promise<void> {
  try {
    const webApi = createAzureDevOpsClient(params.org);
    const gitApi = await webApi.getGitApi();

    await gitApi.updateThread(
      { status: CommentThreadStatus.Active },
      params.repoId,
      params.prId,
      params.threadId,
      params.project,
    );
  } catch (err) {
    logger.error(err, "Failed to reopen Azure DevOps PR thread");
    throw err;
  }
}

export async function listPullRequestThreads(
  params: ListPullRequestThreadsParams,
): Promise<GitPullRequestCommentThread[]> {
  try {
    const webApi = createAzureDevOpsClient(params.org);
    const gitApi = await webApi.getGitApi();

    return await gitApi.getThreads(params.repoId, params.prId, params.project);
  } catch (err) {
    logger.error(err, "Failed to list Azure DevOps PR threads");
    throw err;
  }
}
