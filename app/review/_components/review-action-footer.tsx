"use client";

import { useRouter } from "next/navigation";
import { RefreshCwIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { CardFooter } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
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

        <LoadingButton
          type="submit"
          disabled={isAnyPending}
          loading={isPublishing}
          loadingText="Publishing…"
        >
          <SendIcon />
          Publish to Azure DevOps
        </LoadingButton>
      </form>

      <form onSubmit={handleRerunSubmit}>
        <input type="hidden" name={REVIEW_FORM_FIELD.PrUrl} value={prUrl} />

        <LoadingButton
          type="submit"
          variant="outline"
          disabled={isAnyPending}
          loading={isRerunning}
          loadingText="Re-running…"
        >
          <RefreshCwIcon />
          Re-run review
        </LoadingButton>
      </form>
    </CardFooter>
  );
}
