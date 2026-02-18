import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { REVIEW_FORM_FIELD } from "./form-fields";
import { reviewPublishErrorUrl } from "./routes";
import { FindingSchema } from "@/lib/validation/finding";
import type { getCachedReviewRun } from "@/server/review/get-or-run-review";
import { ReviewRunError } from "@/server/review/errors";

export function getCorrelationIdFromFormData(formData: FormData): string {
  const correlationId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.CorrelationId);
  return correlationId === "" ? crypto.randomUUID() : correlationId;
}

export function createRedirectToPublishError(correlationId: string) {
  return (params?: { prUrl?: string }): never => {
    redirect(reviewPublishErrorUrl({ prUrl: params?.prUrl, correlationId }));
  };
}

export function toReviewRunError(params: {
  error: unknown;
  message: string;
  correlationId: string;
}): ReviewRunError {
  if (params.error instanceof ReviewRunError) return params.error;

  return new ReviewRunError({
    message: params.message,
    correlationId: params.correlationId,
    cause: params.error,
  });
}

export function requireCachedReviewRun(
  cached: Awaited<ReturnType<typeof getCachedReviewRun>>,
  prUrl: string,
  redirectToPublishError: (params?: { prUrl?: string }) => never,
): NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>> {
  if (cached) return cached;
  return redirectToPublishError({ prUrl });
}

export function parseCachedFindingsOrRedirect(
  cached: NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>>,
  prUrl: string,
  redirectToPublishError: (params?: { prUrl?: string }) => never,
) {
  const findingsResult = FindingSchema.array().safeParse(cached.result.findings);
  if (!findingsResult.success) return redirectToPublishError({ prUrl });
  return findingsResult.data;
}

export function toErrorForLogging(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string" && err.trim() !== "") return new Error(err);
  return new Error(fallbackMessage);
}
