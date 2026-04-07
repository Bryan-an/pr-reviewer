"use client";

import { UndoIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { logger } from "@/lib/logging/logger";

import type { RestoreAllActionArgs, RestoreAllActionResult } from "../_actions/restore-all-action";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RestoreAllButtonProps = Readonly<{
  effectiveRunId: string;
  restorableCount: number;
  restoreAllAction: (args: RestoreAllActionArgs) => Promise<RestoreAllActionResult>;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RestoreAllButton({
  effectiveRunId,
  restorableCount,
  restoreAllAction,
}: RestoreAllButtonProps) {
  const { isAnyPending, isRestoring, startRestoreTransition } = useReviewActions();

  function handleConfirm() {
    startRestoreTransition(async () => {
      try {
        const result = await restoreAllAction({ runId: effectiveRunId });

        if (result.success) {
          if (result.restoredCount === 0) {
            toast.success("All findings are already pending.");
          } else {
            const label = result.restoredCount === 1 ? "finding" : "findings";
            toast.success(`Restored ${result.restoredCount} ${label} to pending.`);
          }
        } else {
          toast.error("Restore failed. Please try again.");
        }
      } catch (err) {
        logger.error(err, "[restoreAll] unexpected error");
        toast.error("Restore failed. Please try again.");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <LoadingButton
          variant="outline"
          size="sm"
          disabled={isAnyPending}
          loading={isRestoring}
          loadingText="Restoring…"
        >
          <UndoIcon className="size-3.5" />
          Restore All
        </LoadingButton>
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Restore all findings?</AlertDialogTitle>
          <AlertDialogDescription>
            {restorableCount === 1
              ? "1 published or ignored finding will be reset to pending."
              : `${restorableCount} published or ignored findings will be reset to pending.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Restore All</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
