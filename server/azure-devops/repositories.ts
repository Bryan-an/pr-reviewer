import "server-only";

import type { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";
import { z } from "zod";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";

const orgSchema = z.string().trim().min(1);
const projectSchema = z.string().trim().min(1);
const repoIdOrNameSchema = z.string().trim().min(1);

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
  const org = orgSchema.parse(params.org);
  const project = projectSchema.parse(params.project);

  const webApi = createAzureDevOpsClient(org);
  const gitApi = await webApi.getGitApi();

  const repos: GitRepository[] = await gitApi.getRepositories(project);

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
  const org = orgSchema.parse(params.org);
  const project = projectSchema.parse(params.project);
  const repoIdOrName = repoIdOrNameSchema.parse(params.repoIdOrName);

  const webApi = createAzureDevOpsClient(org);
  const gitApi = await webApi.getGitApi();

  const repo = await gitApi.getRepository(repoIdOrName, project);

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
