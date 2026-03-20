import "server-only";

import { NextResponse } from "next/server";

import { reviewRequestSchema } from "@/lib/validation/review-request";
import { logger } from "@/lib/logging/logger";
import { isAllEnginesFailedError, isEmptyDiffError } from "@/server/review/errors";
import { getCachedReviewRun, runAndPersistReview } from "@/server/review/get-or-run-review";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logger.warn("Invalid JSON body in review/run route");
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = reviewRequestSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, "Invalid input in review/run route");
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { prUrl } = parsed.data;

  // Return a cached run if one exists (avoids re-running the review).
  try {
    const cached = await getCachedReviewRun({ prUrl });

    if (cached) {
      logger.info({ prUrl, runId: cached.runId }, "Returning cached review run");
      return NextResponse.json({ runId: cached.runId });
    }
  } catch (err) {
    logger.error({ err, prUrl }, "getCachedReviewRun failed in review/run route");
    // Fall through to run a fresh review.
  }

  // Check whether the client disconnected before starting the expensive work.
  if (request.signal.aborted) {
    logger.info({ prUrl }, "Request aborted before review pipeline started");
    return NextResponse.json({ error: "Request aborted." }, { status: 499 });
  }

  const correlationId = crypto.randomUUID();
  logger.info({ correlationId, prUrl }, "Review pipeline started");

  try {
    const { runId } = await runAndPersistReview(parsed.data);
    logger.info({ correlationId, prUrl, runId }, "Review pipeline completed");
    return NextResponse.json({ runId });
  } catch (err) {
    if (isEmptyDiffError(err)) {
      logger.warn({ correlationId, prUrl }, "Empty diff — PR has no reviewable changes");
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    if (isAllEnginesFailedError(err)) {
      logger.error({ correlationId, prUrl, err }, "All review engines failed");

      return NextResponse.json(
        {
          error:
            "All review engines failed. Ensure CodeRabbit CLI and Claude Code CLI are installed and authenticated.",
        },
        { status: 502 },
      );
    }

    logger.error({ correlationId, prUrl, err }, "runAndPersistReview failed in review/run route");

    return NextResponse.json(
      {
        error:
          "Review failed. Ensure the PR URL is correct, AZURE_DEVOPS_PAT is set on the server, and the review engines are properly configured.",
      },
      { status: 502 },
    );
  }
}
