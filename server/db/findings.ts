import "server-only";

import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";
import { prisma } from "@/server/db/prisma";

export async function getFindingWithReviewRun(findingDbId: string) {
  return prisma.finding.findUnique({
    where: { id: findingDbId },
    include: {
      reviewRun: {
        select: { prUrl: true, org: true, project: true, repoId: true, prId: true },
      },
    },
  });
}

export async function updateFindingStatus(findingDbId: string, status: FindingStatus) {
  return prisma.finding.update({
    where: { id: findingDbId },
    data: { status },
  });
}

export async function bulkUpdateFindingStatus(findingDbIds: string[], status: FindingStatus) {
  return prisma.finding.updateMany({
    where: { id: { in: findingDbIds } },
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

export async function updateFindingAdoThreadId(findingDbId: string, adoThreadId: number) {
  await prisma.finding.update({
    where: { id: findingDbId },
    data: { adoThreadId },
  });
}
