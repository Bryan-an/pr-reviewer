import "server-only";

import type { TeamProjectReference } from "azure-devops-node-api/interfaces/CoreInterfaces";

import { createAzureDevOpsClient } from "@/server/azure-devops/client";

export type AzureDevOpsProject = {
  id: string;
  name: string;
  state?: string;
};

export async function listAzureDevOpsProjects(params: {
  org: string;
  top?: number;
  skip?: number;
}): Promise<{ projects: AzureDevOpsProject[] }> {
  const webApi = createAzureDevOpsClient(params.org);
  const coreApi = await webApi.getCoreApi();

  const projects: TeamProjectReference[] = await coreApi.getProjects(
    undefined,
    params.top ?? 100,
    params.skip ?? 0,
  );

  return {
    projects: projects
      .map((p) => ({
        id: p.id ?? "",
        name: p.name ?? "",
        state: p.state ?? undefined,
      }))
      .filter((p) => p.id !== "" && p.name.trim() !== ""),
  };
}
