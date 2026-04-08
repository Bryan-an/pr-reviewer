import "server-only";

import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";
import { prisma } from "@/server/db/prisma";

export async function getFindingWithReviewRun(findingId: string) {
  return prisma.finding.findUnique({
    where: { id: findingId },
    include: {
      reviewRun: {
        select: { prUrl: true, org: true, project: true, repoId: true, prId: true },
      },
    },
  });
}

export async function updateFindingStatus(findingId: string, status: FindingStatus) {
  return prisma.finding.update({
    where: { id: findingId },
    data: { status },
  });
}

export async function bulkUpdateFindingStatus(findingIds: string[], status: FindingStatus) {
  return prisma.finding.updateMany({
    where: { id: { in: findingIds } },
    data: { status },
  });
}

export async function getRestorableFindingsByRunId(runId: string) {
  return prisma.finding.findMany({
    where: {
      reviewRunId: runId,
      status: { in: [FINDING_STATUS.Published, FINDING_STATUS.Ignored] },
    },
    select: { id: true, status: true, adoThreadId: true, findingKey: true },
  });
}

export async function updateFindingAdoThreadId(findingId: string, adoThreadId: number) {
  await prisma.finding.update({
    where: { id: findingId },
    data: { adoThreadId },
  });
}
