import "server-only";

import { prisma } from "@/server/db/prisma";

export type UpsertRepositoryInput = {
  org: string;
  project: string;
  adoRepoId: string;
  name: string;
  remoteUrl: string;
};

export async function getRepositoryByUnique(params: {
  org: string;
  project: string;
  adoRepoId: string;
}) {
  return await prisma.repository.findUnique({
    where: {
      org_project_adoRepoId: {
        org: params.org,
        project: params.project,
        adoRepoId: params.adoRepoId,
      },
    },
  });
}

export async function upsertRepositoryFromAdoRepo(input: UpsertRepositoryInput) {
  return await prisma.repository.upsert({
    where: {
      org_project_adoRepoId: {
        org: input.org,
        project: input.project,
        adoRepoId: input.adoRepoId,
      },
    },
    create: {
      org: input.org,
      project: input.project,
      adoRepoId: input.adoRepoId,
      name: input.name,
      remoteUrl: input.remoteUrl,
    },
    update: {
      name: input.name,
      remoteUrl: input.remoteUrl,
    },
  });
}

export async function getRepositoryRuleCountsForAdoRepos(params: {
  org: string;
  project: string;
  adoRepoIds: string[];
}): Promise<Record<string, number>> {
  const ids = [...new Set(params.adoRepoIds)].filter((v) => v.trim() !== "");
  if (ids.length === 0) return {};

  const repos = await prisma.repository.findMany({
    where: { org: params.org, project: params.project, adoRepoId: { in: ids } },
    select: { id: true, adoRepoId: true },
  });

  if (repos.length === 0) return {};

  const repoIds = repos.map((r) => r.id);

  const grouped = await prisma.repoRule.groupBy({
    by: ["repositoryId"],
    where: { repositoryId: { in: repoIds } },
    _count: { _all: true },
  });

  const countsByRepoId = new Map(grouped.map((g) => [g.repositoryId, g._count._all]));
  const result: Record<string, number> = {};

  for (const r of repos) {
    result[r.adoRepoId] = countsByRepoId.get(r.id) ?? 0;
  }

  return result;
}
