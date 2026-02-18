"use server";

import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/form-data";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { reviewUrl } from "../_lib/routes";
import { reviewRequestSchema } from "@/lib/validation/review-request";
import { logger } from "@/server/logging/logger";
import { runAndPersistReview } from "@/server/review/get-or-run-review";

import { toReviewRunError, toErrorForLogging } from "../_lib/review-action-utils";

export async function rerunAction(formData: FormData) {
  const prUrl = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.PrUrl);
  if (!prUrl) redirect("/review");

  const parsed = reviewRequestSchema.safeParse({ prUrl });
  if (!parsed.success) redirect("/review");

  let runId: string;

  try {
    ({ runId } = await runAndPersistReview(parsed.data));
  } catch (err) {
    const correlationId = crypto.randomUUID();

    const wrapped = toReviewRunError({
      error: err,
      message: "runAndPersistReview failed in rerunAction.",
      correlationId,
    });

    const originalErrorToLog = toErrorForLogging(err, "rerunAction failed.");

    logger.error(
      {
        correlationId,
        prUrl,
        err: wrapped,
        originalError: originalErrorToLog,
      },
      "rerunAction failed",
    );

    const message = "Review re-run failed.";
    redirect(reviewUrl({ prUrl, error: message }));
  }

  redirect(reviewUrl({ prUrl, runId }));
}
