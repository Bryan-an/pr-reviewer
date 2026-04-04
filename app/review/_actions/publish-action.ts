"use server";

import { revalidatePath } from "next/cache";

import { FINDING_STATUS } from "@/lib/validation/finding-status";
import { logger } from "@/lib/logging/logger";
import { bulkUpdateFindingStatus } from "@/server/db/findings";
import { publishFindings } from "@/server/review/publish/publish-review";
import { getCachedReviewRun } from "@/server/review/get-or-run-review";

import type { ReviewEngineName } from "@/lib/validation/review-engine-name";

import {
  toReviewRunError,
  parseCachedFindings,
  toErrorForLogging,
} from "../_lib/review-action-utils";

export type PublishActionArgs = {
  prUrl: string;
  runId: string;
  engineName: ReviewEngineName;
  correlationId: string;
};

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

export async function publishAction(args: PublishActionArgs): Promise<PublishActionResult> {
  const { prUrl, runId, engineName, correlationId } = args;

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

  // Only publish findings that are still pending (skip published + ignored).
  const pendingFindings = findingsResult.data.filter(
    (f) => !f.status || f.status === FINDING_STATUS.Pending,
  );

  if (pendingFindings.length === 0) {
    return {
      success: true,
      publishedThreads: 0,
      skippedThreads: findingsResult.data.length,
      totalThreads: 0,
      wasCapped: false,
      cap: 50,
    };
  }

  try {
    const result = await publishFindings({
      prUrl,
      findings: pendingFindings,
    });

    // Mark only findings whose threads were actually published or already existed on ADO.
    // Capped findings are excluded — they were never sent and remain pending.
    const processedIdSet = new Set(result.processedFindings.map((pf) => pf.findingId));

    const publishedDbIds = pendingFindings
      .filter((f) => f.dbId && processedIdSet.has(f.id))
      .map((f) => f.dbId as string);

    if (publishedDbIds.length > 0) {
      try {
        await bulkUpdateFindingStatus(publishedDbIds, FINDING_STATUS.Published);
      } catch (err) {
        logger.warn(
          { correlationId, err: err instanceof Error ? err.message : String(err) },
          "bulk status update after publish failed (non-fatal)",
        );
      }
    }

    revalidatePath("/review");

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
