"use server";

import { revalidatePath } from "next/cache";

import { FINDING_STATUS } from "@/lib/validation/finding-status";
import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { logger } from "@/lib/logging/logger";
import { bulkUpdateFindingStatus, getRestorableFindingsByRunId } from "@/server/db/findings";
import { getReviewRunCoordinates } from "@/server/db/review-runs";
import { closeBulkThreadsByMarkers } from "@/server/review/publish/close-threads";

import { REVIEW_FORM_FIELD } from "../_lib/form-fields";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type RestoreAllActionResult = { success: true; restoredCount: number } | { success: false };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function restoreAllAction(formData: FormData): Promise<RestoreAllActionResult> {
  const runId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.RunId);

  if (!runId) {
    logger.warn("[restoreAll] missing runId");
    return { success: false };
  }

  let rows: Awaited<ReturnType<typeof getRestorableFindingsByRunId>>;

  try {
    rows = await getRestorableFindingsByRunId(runId);
  } catch (err) {
    logger.error(err, "[restoreAll] getRestorableFindingsByRunId failed");
    return { success: false };
  }

  if (rows.length === 0) {
    return { success: true, restoredCount: 0 };
  }

  // Best-effort: close ADO threads for published findings before restoring.
  const publishedWithKey = rows.filter(
    (r) => r.status === FINDING_STATUS.Published && r.findingKey,
  );

  if (publishedWithKey.length > 0) {
    try {
      const coords = await getReviewRunCoordinates(runId);

      if (coords) {
        const { closedCount, failedCount } = await closeBulkThreadsByMarkers({
          org: coords.org,
          project: coords.project,
          repoId: coords.repoId,
          prId: coords.prId,
          publishedFindingKeys: publishedWithKey.map((r) => r.findingKey),
        });

        logger.info({ closedCount, failedCount }, "[restoreAll] ADO thread close summary");
      }
    } catch (err) {
      logger.warn(err, "[restoreAll] ADO thread close phase failed (non-fatal), continuing");
    }
  }

  const ids = rows.map((r) => r.id);

  try {
    await bulkUpdateFindingStatus(ids, FINDING_STATUS.Pending);
  } catch (err) {
    logger.error(err, "[restoreAll] bulkUpdateFindingStatus failed");
    return { success: false };
  }

  revalidatePath("/review");
  return { success: true, restoredCount: ids.length };
}
