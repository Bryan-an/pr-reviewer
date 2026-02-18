"use client";

import { Loader2Icon, RefreshCwIcon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewActionFooterProps = Readonly<{
  prUrl: string;
  effectiveRunId: string | undefined;
  engineName: string;
  correlationId: string;
  publishAction: (formData: FormData) => void | Promise<void>;
  rerunAction: (formData: FormData) => void | Promise<void>;
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
  const { isPublishing, isRerunning, isAnyPending, startPublishTransition, startRerunTransition } =
    useReviewActions();

  return (
    <CardFooter className="flex flex-wrap gap-3">
      <form action={(formData) => startPublishTransition(() => publishAction(formData))}>
        <input type="hidden" name={REVIEW_FORM_FIELD.PrUrl} value={prUrl} />
        {effectiveRunId ? (
          <input type="hidden" name={REVIEW_FORM_FIELD.RunId} value={effectiveRunId} />
        ) : null}
        <input type="hidden" name={REVIEW_FORM_FIELD.EngineName} value={engineName} />
        <input type="hidden" name={REVIEW_FORM_FIELD.CorrelationId} value={correlationId} />

        <Button type="submit" disabled={isAnyPending} className="grid grid-cols-1 grid-rows-1">
          <span
            className="col-start-1 row-start-1 inline-flex items-center gap-2"
            aria-hidden={isPublishing}
            style={isPublishing ? { visibility: "hidden" } : undefined}
          >
            <SendIcon />
            Publish to Azure DevOps
          </span>
          <span
            className="col-start-1 row-start-1 inline-flex items-center gap-2"
            aria-hidden={!isPublishing}
            style={!isPublishing ? { visibility: "hidden" } : undefined}
          >
            <Loader2Icon className="animate-spin" />
            Publishing&hellip;
          </span>
        </Button>
      </form>

      <form action={(formData) => startRerunTransition(() => rerunAction(formData))}>
        <input type="hidden" name={REVIEW_FORM_FIELD.PrUrl} value={prUrl} />

        <Button
          type="submit"
          variant="outline"
          disabled={isAnyPending}
          className="grid grid-cols-1 grid-rows-1"
        >
          <span
            className="col-start-1 row-start-1 inline-flex items-center gap-2"
            aria-hidden={isRerunning}
            style={isRerunning ? { visibility: "hidden" } : undefined}
          >
            <RefreshCwIcon />
            Re-run review
          </span>
          <span
            className="col-start-1 row-start-1 inline-flex items-center gap-2"
            aria-hidden={!isRerunning}
            style={!isRerunning ? { visibility: "hidden" } : undefined}
          >
            <Loader2Icon className="animate-spin" />
            Re-running&hellip;
          </span>
        </Button>
      </form>
    </CardFooter>
  );
}
