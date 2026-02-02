import "server-only";

import type { GitPullRequest } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";

export type PullRequestDescriptor = {
  org: string;
  project: string;
  repo: {
    id: string;
    name: string;
    remoteUrl: string;
  };
  pr: {
    id: number;
    title: string;
    url?: string;
    sourceRefName: string;
    targetRefName: string;
  };
};

export async function fetchPullRequestById(params: {
  org: string;
  project: string;
  prId: number;
}): Promise<PullRequestDescriptor> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  const pr: GitPullRequest = await gitApi.getPullRequestById(params.prId, params.project);

  if (!pr.repository?.id || !pr.repository?.name || !pr.repository?.remoteUrl) {
    throw new Error("Azure DevOps PR is missing repository information.");
  }

  if (!pr.pullRequestId || !pr.title || !pr.sourceRefName || !pr.targetRefName) {
    throw new Error("Azure DevOps PR is missing required metadata.");
  }

  return {
    org: params.org,
    project: params.project,
    repo: {
      id: pr.repository.id,
      name: pr.repository.name,
      remoteUrl: pr.repository.remoteUrl,
    },
    pr: {
      id: pr.pullRequestId,
      title: pr.title,
      url: pr.url ?? undefined,
      sourceRefName: pr.sourceRefName,
      targetRefName: pr.targetRefName,
    },
  };
}
