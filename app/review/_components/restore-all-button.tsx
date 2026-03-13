"use client";

import { Loader2Icon, UndoIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logging/logger";

import type { RestoreAllActionResult } from "../_actions/restore-all-action";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RestoreAllButtonProps = Readonly<{
  effectiveRunId: string;
  restorableCount: number;
  restoreAllAction: (fd: FormData) => Promise<RestoreAllActionResult>;
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
      const fd = new FormData();
      fd.append(REVIEW_FORM_FIELD.RunId, effectiveRunId);

      try {
        const result = await restoreAllAction(fd);

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
        <Button
          variant="outline"
          size="sm"
          disabled={isAnyPending}
          className="grid grid-cols-1 grid-rows-1 justify-items-center"
        >
          <span
            className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
            aria-hidden={isRestoring}
            style={isRestoring ? { visibility: "hidden" } : undefined}
          >
            <UndoIcon className="size-3.5" />
            Restore All
          </span>
          {isRestoring && (
            <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5">
              <Loader2Icon className="size-3.5 animate-spin" />
              Restoring&hellip;
            </span>
          )}
        </Button>
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
