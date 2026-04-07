"use server";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { reviewRequestSchema } from "@/lib/validation/review-request";
import { logger } from "@/lib/logging/logger";
import { runAndPersistReview } from "@/server/review/get-or-run-review";

export type RerunActionResult = { success: true; runId: string } | { success: false };

export async function rerunAction(formData: FormData): Promise<RerunActionResult> {
  const prUrl = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.PrUrl);
  if (!prUrl) return { success: false };

  const parsed = reviewRequestSchema.safeParse({ prUrl });
  if (!parsed.success) return { success: false };

  try {
    const { runId } = await runAndPersistReview(parsed.data);
    return { success: true, runId };
  } catch (err) {
    logger.error(err, "[rerunAction] failed");
    return { success: false };
  }
}
