"use server";

import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { reviewPublishedUrl } from "../_lib/routes";
import { logger } from "@/server/logging/logger";
import { publishFindings } from "@/server/review/publish/publish-review";
import { getCachedReviewRun } from "@/server/review/get-or-run-review";

import {
  getCorrelationIdFromFormData,
  createRedirectToPublishError,
  toReviewRunError,
  requireCachedReviewRun,
  parseCachedFindingsOrRedirect,
  toErrorForLogging,
} from "../_lib/review-action-utils";

async function publishFindingsOrRedirect(params: {
  prUrl: string;
  runId: string;
  engineName: string;
  correlationId: string;
  findings: Parameters<typeof publishFindings>[0]["findings"];
  redirectToPublishError: (params?: { prUrl?: string }) => never;
}): Promise<Awaited<ReturnType<typeof publishFindings>>> {
  try {
    return await publishFindings({
      prUrl: params.prUrl,
      engineName: params.engineName,
      findings: params.findings,
    });
  } catch (err) {
    const errorToLog = toErrorForLogging(err, "publishFindings failed.");

    logger.error(
      {
        correlationId: params.correlationId,
        prUrl: params.prUrl,
        runId: params.runId,
        engineName: params.engineName,
        err: errorToLog,
      },
      "publishFindings failed",
    );

    return params.redirectToPublishError({ prUrl: params.prUrl });
  }
}

export async function publishAction(formData: FormData) {
  const correlationId = getCorrelationIdFromFormData(formData);
  const redirectToPublishError = createRedirectToPublishError(correlationId);

  const prUrl = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.PrUrl);
  const runId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.RunId);

  if (!prUrl) {
    return redirectToPublishError();
  }

  const engineName = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.EngineName);

  if (!runId || !engineName) {
    return redirectToPublishError({ prUrl });
  }

  // We now publish from cached run findings (avoid rerunning review and avoid large payloads).
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
      {
        correlationId,
        prUrl,
        runId,
        engineName,
        err: wrapped,
      },
      "getCachedReviewRun failed",
    );

    return redirectToPublishError({ prUrl });
  }

  const ensuredCached = requireCachedReviewRun(cached, prUrl, redirectToPublishError);
  const findings = parseCachedFindingsOrRedirect(ensuredCached, prUrl, redirectToPublishError);

  const result = await publishFindingsOrRedirect({
    prUrl,
    engineName,
    findings,
    correlationId,
    runId,
    redirectToPublishError,
  });

  redirect(
    reviewPublishedUrl({
      prUrl,
      engineName,
      publishedThreads: result.publishedThreads,
      skippedThreads: result.skippedThreads,
      totalThreads: result.totalThreads,
    }),
  );
}
