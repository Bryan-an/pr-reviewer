import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/form-data";
import { REVIEW_FORM_FIELD } from "./form-fields";
import { REVIEW_SEARCH_PARAM } from "./search-params";
import { FindingSchema } from "@/lib/validation/finding";
import type { getCachedReviewRun } from "@/server/review/get-or-run-review";
import { ReviewRunError } from "@/server/review/errors";

export function getCorrelationIdFromFormData(formData: FormData): string {
  const correlationId = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.CorrelationId);
  return correlationId === "" ? crypto.randomUUID() : correlationId;
}

export function createRedirectToPublishError(correlationId: string) {
  const encodedCorrelationId = encodeURIComponent(correlationId);

  return (params?: { prUrl?: string }): never => {
    const base = "/review/published?";

    const prUrlPart =
      typeof params?.prUrl === "string" && params.prUrl.trim() !== ""
        ? `${REVIEW_FORM_FIELD.PrUrl}=${encodeURIComponent(params.prUrl)}&`
        : "";

    redirect(
      `${base}${prUrlPart}${REVIEW_SEARCH_PARAM.PublishError}=1&${REVIEW_FORM_FIELD.CorrelationId}=${encodedCorrelationId}`,
    );
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
