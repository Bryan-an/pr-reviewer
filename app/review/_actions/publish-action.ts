"use server";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { logger } from "@/lib/logging/logger";
import { publishFindings } from "@/server/review/publish/publish-review";
import { getCachedReviewRun } from "@/server/review/get-or-run-review";

import {
  getCorrelationIdFromFormData,
  toReviewRunError,
  parseCachedFindings,
  toErrorForLogging,
} from "../_lib/review-action-utils";

export type PublishActionResult =
  | {
      success: true;
      publishedThreads: number;
      skippedThreads: number;
      totalThreads: number;
      wasCapped: boolean;
      cap: number;
    }
  | { success: false };

export async function publishAction(formData: FormData): Promise<PublishActionResult> {
  const correlationId = getCorrelationIdFromFormData(formData);

  const prUrl = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.PrUrl);
  const runId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.RunId);
  const engineName = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.EngineName);

  if (!prUrl || !runId || !engineName) {
    return { success: false };
  }

  let cached: Awaited<ReturnType<typeof getCachedReviewRun>>;

  try {
    cached = await getCachedReviewRun({ prUrl, runId });
  } catch (err) {
    const wrapped = toReviewRunError({
      error: err,
      message: "getCachedReviewRun failed in publishAction.",
      correlationId,
    });

    logger.error(
      { correlationId, prUrl, runId, engineName, err: wrapped },
      "getCachedReviewRun failed",
    );

    return { success: false };
  }

  if (!cached) return { success: false };

  const findingsResult = parseCachedFindings(cached);
  if (!findingsResult.success) return { success: false };

  try {
    const result = await publishFindings({
      prUrl,
      findings: findingsResult.data,
    });

    return {
      success: true,
      publishedThreads: result.publishedThreads,
      skippedThreads: result.skippedThreads,
      totalThreads: result.totalThreads,
      wasCapped: result.wasCapped,
      cap: result.cap,
    };
  } catch (err) {
    const errorToLog = toErrorForLogging(err, "publishFindings failed.");

    logger.error(
      { correlationId, prUrl, runId, engineName, err: errorToLog },
      "publishFindings failed",
    );

    return { success: false };
  }
}
