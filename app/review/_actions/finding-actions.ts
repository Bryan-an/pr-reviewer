"use server";

import { revalidatePath } from "next/cache";

import {
  FINDING_STATUS,
  type FindingStatus,
  isValidStatusTransition,
} from "@/lib/validation/finding-status";
import { logger } from "@/lib/logging/logger";
import { getFindingWithReviewRun, updateFindingStatus } from "@/server/db/findings";
import { closeSingleThread } from "@/server/review/publish/close-threads";
import { publishFindings } from "@/server/review/publish/publish-review";
import type { Finding } from "@/server/review/types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type FindingActionResult = { success: true } | { success: false };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getValidatedFinding(findingDbId: string) {
  if (!findingDbId) return null;

  return getFindingWithReviewRun(findingDbId);
}

function toDomainFinding(
  row: NonNullable<Awaited<ReturnType<typeof getFindingWithReviewRun>>>,
): Finding {
  return {
    id: row.findingKey,
    dbId: row.id,
    severity: row.severity as Finding["severity"],
    category: row.category as Finding["category"],
    title: row.title,
    message: row.message,
    filePath: row.filePath ?? undefined,
    lineStart: row.lineStart ?? undefined,
    lineEnd: row.lineEnd ?? undefined,
    recommendation: row.recommendation ?? undefined,
  };
}

async function updateStatusAction(
  findingDbId: string,
  targetStatus: FindingStatus,
  actionName: string,
): Promise<FindingActionResult> {
  try {
    const row = await getValidatedFinding(findingDbId);

    if (!row) {
      logger.warn(`[${actionName}] finding not found`);
      return { success: false };
    }

    if (row.status === targetStatus) {
      return { success: true };
    }

    if (!isValidStatusTransition(row.status as FindingStatus, targetStatus)) {
      logger.warn(`[${actionName}] invalid transition: ${row.status} → ${targetStatus}`);
      return { success: false };
    }

    await updateFindingStatus(row.id, targetStatus);
  } catch (err) {
    logger.error(err, `[${actionName}] failed`);
    return { success: false };
  }

  revalidatePath("/review");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Publish a single finding
// ---------------------------------------------------------------------------

export async function publishFindingAction(findingDbId: string): Promise<FindingActionResult> {
  try {
    const row = await getValidatedFinding(findingDbId);

    if (!row) {
      logger.warn("[publishFinding] finding not found");
      return { success: false };
    }

    if (row.status === FINDING_STATUS.Published) {
      return { success: true };
    }

    if (!isValidStatusTransition(row.status as FindingStatus, FINDING_STATUS.Published)) {
      logger.warn(`[publishFinding] invalid transition: ${row.status} → published`);
      return { success: false };
    }

    const prUrl = row.reviewRun.prUrl;
    const domainFinding = toDomainFinding(row);

    await publishFindings({ prUrl, findings: [domainFinding] });
    await updateFindingStatus(row.id, FINDING_STATUS.Published);
  } catch (err) {
    logger.error(err, "[publishFinding] failed");
    return { success: false };
  }

  revalidatePath("/review");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Ignore a finding
// ---------------------------------------------------------------------------

export async function ignoreFindingAction(findingDbId: string): Promise<FindingActionResult> {
  return updateStatusAction(findingDbId, FINDING_STATUS.Ignored, "ignoreFinding");
}

// ---------------------------------------------------------------------------
// Restore a finding (undo publish or ignore)
// ---------------------------------------------------------------------------

export async function restoreFindingAction(findingDbId: string): Promise<FindingActionResult> {
  try {
    const row = await getValidatedFinding(findingDbId);

    if (!row) {
      logger.warn("[restoreFinding] finding not found");
      return { success: false };
    }

    if (row.status === FINDING_STATUS.Pending) {
      return { success: true };
    }

    if (!isValidStatusTransition(row.status as FindingStatus, FINDING_STATUS.Pending)) {
      logger.warn(`[restoreFinding] invalid transition: ${row.status} → pending`);
      return { success: false };
    }

    // Best-effort ADO thread close for published findings with a stored thread ID.
    if (row.status === FINDING_STATUS.Published && row.adoThreadId != null) {
      try {
        await closeSingleThread({
          org: row.reviewRun.org,
          project: row.reviewRun.project,
          repoId: row.reviewRun.repoId,
          prId: row.reviewRun.prId,
          adoThreadId: row.adoThreadId,
        });
      } catch (err) {
        logger.warn(err, "[restoreFinding] ADO thread close failed (non-fatal), continuing");
      }
    }

    await updateFindingStatus(row.id, FINDING_STATUS.Pending);
  } catch (err) {
    logger.error(err, "[restoreFinding] failed");
    return { success: false };
  }

  revalidatePath("/review");
  return { success: true };
}
