"use server";

import { revalidatePath } from "next/cache";

import {
  FINDING_STATUS,
  type FindingStatus,
  isValidStatusTransition,
} from "@/lib/validation/finding-status";
import { logger } from "@/lib/logging/logger";
import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { getFindingWithReviewRun, updateFindingStatus } from "@/server/db/findings";
import { publishFindings } from "@/server/review/publish/publish-review";
import type { Finding } from "@/server/review/types";

import { REVIEW_FORM_FIELD } from "../_lib/form-fields";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type FindingActionResult = { success: true } | { success: false };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getValidatedFinding(formData: FormData) {
  const findingDbId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.FindingDbId);

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
  formData: FormData,
  targetStatus: FindingStatus,
  actionName: string,
): Promise<FindingActionResult> {
  const row = await getValidatedFinding(formData);

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

  try {
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

export async function publishFindingAction(formData: FormData): Promise<FindingActionResult> {
  const row = await getValidatedFinding(formData);

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

  try {
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

export async function ignoreFindingAction(formData: FormData): Promise<FindingActionResult> {
  return updateStatusAction(formData, FINDING_STATUS.Ignored, "ignoreFinding");
}

// ---------------------------------------------------------------------------
// Restore a finding (undo ignore)
// ---------------------------------------------------------------------------

export async function restoreFindingAction(formData: FormData): Promise<FindingActionResult> {
  return updateStatusAction(formData, FINDING_STATUS.Pending, "restoreFinding");
}
