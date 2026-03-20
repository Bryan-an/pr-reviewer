"use client";

import { useRouter } from "next/navigation";
import { Loader2Icon, RefreshCwIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { logger } from "@/lib/logging/logger";

import type { PublishActionResult } from "../_actions/publish-action";
import type { RerunActionResult } from "../_actions/rerun-action";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { reviewUrl } from "../_lib/routes";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewActionFooterProps = Readonly<{
  prUrl: string;
  effectiveRunId: string | undefined;
  engineName: string;
  correlationId: string;
  publishAction: (formData: FormData) => Promise<PublishActionResult>;
  rerunAction: (formData: FormData) => Promise<RerunActionResult>;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewActionFooter({
  prUrl,
  effectiveRunId,
  engineName,
  correlationId,
  publishAction,
  rerunAction,
}: ReviewActionFooterProps) {
  const router = useRouter();

  const { isPublishing, isRerunning, isAnyPending, startPublishTransition, startRerunTransition } =
    useReviewActions();

  function handlePublishSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startPublishTransition(async () => {
      let result: PublishActionResult;

      try {
        result = await publishAction(formData);
      } catch (err) {
        logger.error(err, "[publish] unexpected error");

        toast.error(
          "Publish failed. Confirm your Azure DevOps permissions and that the PR is accessible.",
        );

        return;
      }

      if (result.success) {
        const threadLabel = result.publishedThreads === 1 ? "thread" : "threads";

        const skippedPart =
          result.skippedThreads > 0
            ? ` Skipped ${result.skippedThreads} already-posted ${result.skippedThreads === 1 ? "thread" : "threads"}.`
            : "";

        const capPart = result.wasCapped ? ` (capped at ${result.cap})` : "";

        toast.success(
          `Published ${result.publishedThreads} ${threadLabel}${capPart}.${skippedPart} Total considered: ${result.totalThreads}.`,
        );
      } else {
        toast.error(
          "Publish failed. Confirm your Azure DevOps permissions and that the PR is accessible.",
        );
      }
    });
  }

  function handleRerunSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startRerunTransition(async () => {
      let result: RerunActionResult;

      try {
        result = await rerunAction(formData);
      } catch (err) {
        logger.error(err, "[rerun] unexpected error");
        toast.error("Review re-run failed. Please try again.");
        return;
      }

      if (result.success) {
        router.replace(reviewUrl({ prUrl, runId: result.runId }));
      } else {
        toast.error("Review re-run failed. Please try again.");
      }
    });
  }

  return (
    <CardFooter className="flex flex-wrap gap-3">
      <form onSubmit={handlePublishSubmit}>
        <input type="hidden" name={REVIEW_FORM_FIELD.PrUrl} value={prUrl} />
        {effectiveRunId ? (
          <input type="hidden" name={REVIEW_FORM_FIELD.RunId} value={effectiveRunId} />
        ) : null}
        <input type="hidden" name={REVIEW_FORM_FIELD.EngineName} value={engineName} />
        <input type="hidden" name={REVIEW_FORM_FIELD.CorrelationId} value={correlationId} />

        <Button
          type="submit"
          disabled={isAnyPending}
          className="grid grid-cols-1 grid-rows-1 justify-items-center"
        >
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              isPublishing && "invisible",
            )}
            aria-hidden={isPublishing}
          >
            <SendIcon />
            Publish to Azure DevOps
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              !isPublishing && "invisible",
            )}
            aria-hidden={!isPublishing}
          >
            <Loader2Icon className="animate-spin" />
            Publishing&hellip;
          </span>
        </Button>
      </form>

      <form onSubmit={handleRerunSubmit}>
        <input type="hidden" name={REVIEW_FORM_FIELD.PrUrl} value={prUrl} />

        <Button
          type="submit"
          variant="outline"
          disabled={isAnyPending}
          className="grid grid-cols-1 grid-rows-1 justify-items-center"
        >
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              isRerunning && "invisible",
            )}
            aria-hidden={isRerunning}
          >
            <RefreshCwIcon />
            Re-run review
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2",
              !isRerunning && "invisible",
            )}
            aria-hidden={!isRerunning}
          >
            <Loader2Icon className="animate-spin" />
            Re-running&hellip;
          </span>
        </Button>
      </form>
    </CardFooter>
  );
}
