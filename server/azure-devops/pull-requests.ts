import "server-only";

import type { GitPullRequest } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";
import { logger } from "@/lib/logging/logger";

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
  try {
    const webApi = createAzureDevOpsClient(params.org);
    const gitApi = await webApi.getGitApi();

    const pr: GitPullRequest = await gitApi.getPullRequestById(params.prId, params.project);

    const repoId = pr.repository?.id;
    const repoName = pr.repository?.name;
    const repoRemoteUrl = pr.repository?.remoteUrl;

    if (
      repoId == null ||
      repoName == null ||
      repoName.trim() === "" ||
      repoRemoteUrl == null ||
      repoRemoteUrl.trim() === ""
    ) {
      throw new Error("Azure DevOps PR is missing repository information.");
    }

    const pullRequestId = pr.pullRequestId;
    const title = pr.title;
    const sourceRefName = pr.sourceRefName;
    const targetRefName = pr.targetRefName;

    if (
      pullRequestId == null ||
      title == null ||
      title.trim() === "" ||
      sourceRefName == null ||
      sourceRefName.trim() === "" ||
      targetRefName == null ||
      targetRefName.trim() === ""
    ) {
      throw new Error("Azure DevOps PR is missing required metadata.");
    }

    return {
      org: params.org,
      project: params.project,
      repo: {
        id: repoId,
        name: repoName,
        remoteUrl: repoRemoteUrl,
      },
      pr: {
        id: pullRequestId,
        title,
        url: pr.url ?? undefined,
        sourceRefName,
        targetRefName,
      },
    };
  } catch (err) {
    logger.error(err, "Failed to fetch Azure DevOps pull request");
    throw err;
  }
}
