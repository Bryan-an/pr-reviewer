import "server-only";

import type { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import type { Finding as DomainFinding, ReviewRunResult } from "@/server/review/types";

export type CreateReviewRunInput = {
  prUrl: string;
  pr: ReviewRunResult["pr"] & {
    sourceRefName: string;
    targetRefName: string;
  };
  baseSha: string;
  headSha: string;
  engineName: string;
  findings: DomainFinding[];
};

function toFindingCreateMany(
  reviewRunId: string,
  findings: DomainFinding[],
): Prisma.FindingCreateManyInput[] {
  return findings.map((f) => ({
    reviewRunId,
    findingKey: f.id,
    severity: f.severity,
    category: f.category,
    title: f.title,
    message: f.message,
    filePath: f.filePath,
    recommendation: f.recommendation,
  }));
}

function toDomainResult(params: {
  run: {
    id: string;
    org: string;
    project: string;
    repoId: string;
    repoName: string;
    prId: number;
    title: string;
    prUrl: string;
    engineName: string;
    createdAt: Date;
  };
  findings: Array<{
    findingKey: string;
    severity: string;
    category: string;
    title: string;
    message: string;
    filePath: string | null;
    recommendation: string | null;
  }>;
}): ReviewRunResult {
  const domainFindings: DomainFinding[] = params.findings.map((f) => ({
    id: f.findingKey,
    severity: f.severity as DomainFinding["severity"],
    category: f.category as DomainFinding["category"],
    title: f.title,
    message: f.message,
    filePath: f.filePath ?? undefined,
    recommendation: f.recommendation ?? undefined,
  }));

  const bySeverity = domainFindings.reduce<Record<DomainFinding["severity"], number>>(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { info: 0, warn: 0, error: 0 },
  );

  return {
    pr: {
      org: params.run.org,
      project: params.run.project,
      repoId: params.run.repoId,
      repoName: params.run.repoName,
      prId: params.run.prId,
      title: params.run.title,
      url: params.run.prUrl,
    },
    engine: { name: params.run.engineName },
    summary: { totalFindings: domainFindings.length, bySeverity },
    findings: domainFindings,
  };
}

export async function createReviewRun(input: CreateReviewRunInput): Promise<{ runId: string }> {
  const run = await prisma.reviewRun.create({
    data: {
      prUrl: input.prUrl,
      org: input.pr.org,
      project: input.pr.project,
      repoId: input.pr.repoId,
      repoName: input.pr.repoName,
      prId: input.pr.prId,
      title: input.pr.title,
      sourceRefName: input.pr.sourceRefName,
      targetRefName: input.pr.targetRefName,
      baseSha: input.baseSha,
      headSha: input.headSha,
      engineName: input.engineName,
    },
  });

  if (input.findings.length > 0) {
    await prisma.finding.createMany({
      data: toFindingCreateMany(run.id, input.findings),
    });
  }

  return { runId: run.id };
}

export async function getLatestReviewRunByPrUrl(prUrl: string): Promise<{
  runId: string;
  result: ReviewRunResult;
} | null> {
  const run = await prisma.reviewRun.findFirst({
    where: { prUrl },
    orderBy: { createdAt: "desc" },
  });

  if (!run) return null;

  const findings = await prisma.finding.findMany({
    where: { reviewRunId: run.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    runId: run.id,
    result: toDomainResult({ run, findings }),
  };
}

export async function getReviewRunById(runId: string): Promise<{
  runId: string;
  result: ReviewRunResult;
  findings: DomainFinding[];
} | null> {
  const run = await prisma.reviewRun.findUnique({ where: { id: runId } });
  if (!run) return null;

  const findings = await prisma.finding.findMany({
    where: { reviewRunId: run.id },
    orderBy: { createdAt: "asc" },
  });

  const result = toDomainResult({ run, findings });

  return {
    runId: run.id,
    result,
    findings: result.findings,
  };
}
