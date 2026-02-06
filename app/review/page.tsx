import Link from "next/link";
import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/form-data";
import { getFirst, parseNonNegativeIntParam } from "@/lib/search-params";
import { FindingSchema } from "@/lib/validation/finding";
import { reviewRequestSchema, runIdSchema } from "@/lib/validation/review-request";
import { logger } from "@/server/logging/logger";
import { publishFindings } from "@/server/review/publish/publish-review";
import { getCachedReviewRun, runAndPersistReview } from "@/server/review/get-or-run-review";
import { ReviewRunError } from "@/server/review/errors";

import { ReviewResults } from "./_components/review-results";
import { ReviewRunner } from "./_components/review-runner";

type ReviewPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function getCorrelationIdFromFormData(formData: FormData): string {
  const correlationId = getTrimmedStringFormField(formData, "correlationId");
  return correlationId === "" ? crypto.randomUUID() : correlationId;
}

function createRedirectToPublishError(correlationId: string) {
  const encodedCorrelationId = encodeURIComponent(correlationId);

  return (params?: { prUrl?: string }): never => {
    const base = "/review/published?";

    const prUrlPart =
      typeof params?.prUrl === "string" && params.prUrl.trim() !== ""
        ? `prUrl=${encodeURIComponent(params.prUrl)}&`
        : "";

    redirect(`${base}${prUrlPart}publishError=1&correlationId=${encodedCorrelationId}`);
  };
}

function toReviewRunError(params: {
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

function requireCachedReviewRun(
  cached: Awaited<ReturnType<typeof getCachedReviewRun>>,
  prUrl: string,
  redirectToPublishError: (params?: { prUrl?: string }) => never,
): NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>> {
  if (cached) return cached;
  return redirectToPublishError({ prUrl });
}

function parseCachedFindingsOrRedirect(
  cached: NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>>,
  prUrl: string,
  redirectToPublishError: (params?: { prUrl?: string }) => never,
) {
  const findingsResult = FindingSchema.array().safeParse(cached.result.findings);
  if (!findingsResult.success) return redirectToPublishError({ prUrl });
  return findingsResult.data;
}

function toErrorForLogging(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string" && err.trim() !== "") return new Error(err);
  return new Error(fallbackMessage);
}

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

async function publishAction(formData: FormData) {
  "use server";
  const correlationId = getCorrelationIdFromFormData(formData);
  const redirectToPublishError = createRedirectToPublishError(correlationId);

  const prUrl = getTrimmedStringFormField(formData, "prUrl");
  const runId = getTrimmedStringFormField(formData, "runId");

  if (!prUrl) {
    return redirectToPublishError();
  }

  const engineName = getTrimmedStringFormField(formData, "engineName");

  if (!runId) {
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
    `/review/published?prUrl=${encodeURIComponent(prUrl)}&engineName=${encodeURIComponent(engineName)}&published=1&publishedThreads=${result.publishedThreads}&skippedThreads=${result.skippedThreads}&totalThreads=${result.totalThreads}`,
  );
}

async function rerunAction(formData: FormData) {
  "use server";
  const prUrl = getTrimmedStringFormField(formData, "prUrl");
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
    redirect(`/review?prUrl=${encodeURIComponent(prUrl)}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/review?prUrl=${encodeURIComponent(prUrl)}&runId=${encodeURIComponent(runId)}`);
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params.prUrl);
  const runId = getFirst(params.runId);
  const correlationId = crypto.randomUUID();
  const published = getFirst(params.published) === "1";
  const publishError = getFirst(params.publishError) === "1";
  const error = getFirst(params.error);
  const publishedThreads = parseNonNegativeIntParam(getFirst(params.publishedThreads), 0);
  const skippedThreads = parseNonNegativeIntParam(getFirst(params.skippedThreads), 0);
  const totalThreads = parseNonNegativeIntParam(getFirst(params.totalThreads), 0);

  if (!prUrl) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">Missing PR URL.</p>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          Go back
        </Link>
      </div>
    );
  }

  const parsed = reviewRequestSchema.safeParse({ prUrl });

  if (!parsed.success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">Invalid input.</p>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          Go back
        </Link>
      </div>
    );
  }

  // When a runId is present, validate it and try to load the cached review run.
  let cacheLoadError: string | undefined;
  let cached: Awaited<ReturnType<typeof getCachedReviewRun>> = null;

  if (runId) {
    const runIdResult = runIdSchema.safeParse(runId);

    if (runIdResult.success) {
      try {
        cached = await getCachedReviewRun({ prUrl, runId: runIdResult.data });

        if (!cached) {
          cacheLoadError = "The previous review run was not found. Starting a new review.";
        }
      } catch (err) {
        logger.error(
          { correlationId, prUrl, runId, err },
          "getCachedReviewRun failed in ReviewPage",
        );

        cacheLoadError = "Failed to load the previous review. Starting a new review.";
      }
    } else {
      logger.error({ correlationId, prUrl, runId }, "Invalid runId format in ReviewPage");
      cacheLoadError = "The review run ID is invalid. Starting a new review.";
    }
  }

  if (cached) {
    return (
      <ReviewResults
        result={cached.result}
        effectiveRunId={cached.runId}
        prUrl={prUrl}
        correlationId={correlationId}
        published={published}
        publishError={publishError}
        error={error}
        publishedThreads={publishedThreads}
        skippedThreads={skippedThreads}
        totalThreads={totalThreads}
        publishAction={publishAction}
        rerunAction={rerunAction}
      />
    );
  }

  // No cached result available -- render the client-side runner that fetches
  // the review asynchronously with loading feedback and cancel support.
  return <ReviewRunner prUrl={prUrl} cacheLoadError={cacheLoadError} />;
}
