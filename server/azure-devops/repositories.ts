import "server-only";

import type { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";

export type AzureDevOpsRepository = {
  id: string;
  name: string;
  remoteUrl: string;
  projectId?: string;
  projectName?: string;
};

export async function listAzureDevOpsRepositories(params: {
  org: string;
  project: string;
}): Promise<{ repositories: AzureDevOpsRepository[] }> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  const repos: GitRepository[] = await gitApi.getRepositories(params.project);

  return {
    repositories: repos
      .map((r) => ({
        id: r.id ?? "",
        name: r.name ?? "",
        remoteUrl: r.remoteUrl ?? "",
        projectId: r.project?.id ?? undefined,
        projectName: r.project?.name ?? undefined,
      }))
      .filter((r) => r.id !== "" && r.name.trim() !== "" && r.remoteUrl.trim() !== ""),
  };
}

export async function getAzureDevOpsRepository(params: {
  org: string;
  project: string;
  repoIdOrName: string;
}): Promise<AzureDevOpsRepository> {
  const webApi = createAzureDevOpsClient(params.org);
  const gitApi = await webApi.getGitApi();

  const repo = await gitApi.getRepository(params.repoIdOrName, params.project);

  const id = repo.id ?? "";
  const name = repo.name ?? "";
  const remoteUrl = repo.remoteUrl ?? "";

  if (id === "" || name.trim() === "" || remoteUrl.trim() === "") {
    throw new Error("Azure DevOps repository is missing required metadata.");
  }

  return {
    id,
    name,
    remoteUrl,
    projectId: repo.project?.id ?? undefined,
    projectName: repo.project?.name ?? undefined,
  };
}
