import "server-only";

import { z } from "zod";

import { prisma } from "@/server/db/prisma";

const repositoryIdSchema = z.string().trim().min(1);
const idSchema = z.string().trim().min(1);

const createRepoRuleSchema = z.object({
  repositoryId: repositoryIdSchema,
  title: z.string().trim().min(1),
  markdown: z.string().trim().min(1),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateRepoRuleSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  markdown: z.string().trim().min(1),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export async function listRepoRules(params: { repositoryId: string }) {
  const repositoryId = repositoryIdSchema.parse(params.repositoryId);

  return await prisma.repoRule.findMany({
    where: { repositoryId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function listEnabledRepoRules(params: { repositoryId: string }) {
  const repositoryId = repositoryIdSchema.parse(params.repositoryId);

  return await prisma.repoRule.findMany({
    where: { repositoryId, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function createRepoRule(input: {
  repositoryId: string;
  title: string;
  markdown: string;
  enabled: boolean;
  sortOrder?: number;
}) {
  const parsed = createRepoRuleSchema.parse(input);

  return await prisma.repoRule.create({
    data: {
      repositoryId: parsed.repositoryId,
      title: parsed.title,
      markdown: parsed.markdown,
      enabled: parsed.enabled,
      sortOrder: parsed.sortOrder ?? 0,
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
  const parsed = updateRepoRuleSchema.parse(input);

  return await prisma.repoRule.update({
    where: { id: parsed.id },
    data: {
      title: parsed.title,
      markdown: parsed.markdown,
      enabled: parsed.enabled,
      sortOrder: parsed.sortOrder,
    },
  });
}

export async function deleteRepoRule(params: { id: string }) {
  const id = idSchema.parse(params.id);
  return await prisma.repoRule.delete({ where: { id } });
}

export async function toggleRepoRuleEnabled(params: { id: string; enabled: boolean }) {
  const id = idSchema.parse(params.id);

  return await prisma.repoRule.update({
    where: { id },
    data: { enabled: params.enabled },
  });
}

export async function getRepoRuleById(params: { id: string }) {
  const id = idSchema.parse(params.id);
  return await prisma.repoRule.findUnique({ where: { id } });
}
