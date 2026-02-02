import "server-only";

import type {
  Comment,
  CommentThreadContext,
  GitPullRequestCommentThread,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import { CommentThreadStatus, CommentType } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";

export type CreatePullRequestThreadParams = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
  content: string;
  filePath?: string;
};

export type ListPullRequestThreadsParams = {
  org: string;
  project: string;
  repoId: string;
  prId: number;
};

function buildThread(params: { content: string; filePath?: string }): GitPullRequestCommentThread {
  const comments: Comment[] = [
    {
      commentType: CommentType.Text,
      content: params.content,
    },
  ];

  const threadContext: CommentThreadContext | undefined = params.filePath
    ? { filePath: params.filePath }
    : undefined;

  return {
    status: CommentThreadStatus.Active,
    comments,
    threadContext,
  };
}

export async function createPullRequestThread(
  params: CreatePullRequestThreadParams,
): Promise<GitPullRequestCommentThread> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  const thread = buildThread({ content: params.content, filePath: params.filePath });
  return await gitApi.createThread(thread, params.repoId, params.prId, params.project);
}

export async function listPullRequestThreads(
  params: ListPullRequestThreadsParams,
): Promise<GitPullRequestCommentThread[]> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  return await gitApi.getThreads(params.repoId, params.prId, params.project);
}
