import "server-only";

import { prisma } from "@/server/db/prisma";

export async function listRepoRules(params: { repositoryId: string }) {
  return await prisma.repoRule.findMany({
    where: { repositoryId: params.repositoryId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
  });
}

export async function listEnabledRepoRules(params: { repositoryId: string }) {
  return await prisma.repoRule.findMany({
    where: { repositoryId: params.repositoryId, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
  });
}

export async function createRepoRule(input: {
  repositoryId: string;
  title: string;
  markdown: string;
  enabled: boolean;
  sortOrder?: number;
}) {
  return await prisma.repoRule.create({
    data: {
      repositoryId: input.repositoryId,
      title: input.title,
      markdown: input.markdown,
      enabled: input.enabled,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateRepoRule(input: {
  id: string;
  title: string;
  markdown: string;
  enabled: boolean;
  sortOrder: number;
}) {
  return await prisma.repoRule.update({
    where: { id: input.id },
    data: {
      title: input.title,
      markdown: input.markdown,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    },
  });
}

export async function deleteRepoRule(params: { id: string }) {
  return await prisma.repoRule.delete({ where: { id: params.id } });
}

export async function toggleRepoRuleEnabled(params: { id: string; enabled: boolean }) {
  return await prisma.repoRule.update({
    where: { id: params.id },
    data: { enabled: params.enabled },
  });
}

export async function getRepoRuleById(params: { id: string }) {
  return await prisma.repoRule.findUnique({ where: { id: params.id } });
}
