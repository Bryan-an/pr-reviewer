import { FindingSchema } from "@/lib/validation/finding";
import type { getCachedReviewRun } from "@/server/review/get-or-run-review";
import { ReviewRunError } from "@/server/review/errors";

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

export function parseCachedFindings(
  cached: NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>>,
) {
  return FindingSchema.array().safeParse(cached.result.findings);
}

export function toErrorForLogging(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string" && err.trim() !== "") return new Error(err);
  return new Error(fallbackMessage);
}
