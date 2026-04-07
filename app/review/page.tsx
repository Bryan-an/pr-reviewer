import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirst } from "@/lib/utils/search-params";
import { reviewRequestSchema, runIdSchema } from "@/lib/validation/review-request";
import { logger } from "@/lib/logging/logger";
import { getCachedReviewRun } from "@/server/review/get-or-run-review";

import {
  publishFindingAction,
  ignoreFindingAction,
  restoreFindingAction,
} from "./_actions/finding-actions";
import { publishAction } from "./_actions/publish-action";
import { rerunAction } from "./_actions/rerun-action";
import { restoreAllAction } from "./_actions/restore-all-action";
import { REVIEW_FORM_FIELD } from "./_lib/form-fields";
import { ReviewResults } from "./_components/review-results";
import { ReviewRunner } from "./_components/review-runner";

type ReviewPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params[REVIEW_FORM_FIELD.PrUrl]);
  const runId = getFirst(params[REVIEW_FORM_FIELD.RunId]);
  if (!prUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Review preview</CardTitle>
            <CardDescription>Missing PR URL.</CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-center">
            <Link className={buttonVariants({ variant: "outline" })} href="/">
              Go back
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const parsed = reviewRequestSchema.safeParse({ prUrl });

  if (!parsed.success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Review preview</CardTitle>
            <CardDescription>Invalid input.</CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-center">
            <Link className={buttonVariants({ variant: "outline" })} href="/">
              Go back
            </Link>
          </CardFooter>
        </Card>
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
        logger.error(err, "[ReviewPage] getCachedReviewRun failed");
        cacheLoadError = "Failed to load the previous review. Starting a new review.";
      }
    } else {
      logger.warn({ runId }, "[ReviewPage] invalid runId format");
      cacheLoadError = "The review run ID is invalid. Starting a new review.";
    }
  }

  if (cached) {
    return (
      <ReviewResults
        result={cached.result}
        effectiveRunId={cached.runId}
        prUrl={prUrl}
        publishAction={publishAction}
        rerunAction={rerunAction}
        publishFindingAction={publishFindingAction}
        ignoreFindingAction={ignoreFindingAction}
        restoreFindingAction={restoreFindingAction}
        restoreAllAction={restoreAllAction}
      />
    );
  }

  // No cached result available -- render the client-side runner that fetches
  // the review asynchronously with loading feedback and cancel support.
  return <ReviewRunner prUrl={prUrl} cacheLoadError={cacheLoadError} />;
}
