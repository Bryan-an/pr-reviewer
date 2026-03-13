"use server";

import { revalidatePath } from "next/cache";

import { FINDING_STATUS } from "@/lib/validation/finding-status";
import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { logger } from "@/lib/logging/logger";
import { bulkUpdateFindingStatus, getRestorableFindingsByRunId } from "@/server/db/findings";

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

  let rows: { id: string }[];

  try {
    rows = await getRestorableFindingsByRunId(runId);
  } catch (err) {
    logger.error(err, "[restoreAll] getRestorableFindingsByRunId failed");
    return { success: false };
  }

  if (rows.length === 0) {
    return { success: true, restoredCount: 0 };
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
