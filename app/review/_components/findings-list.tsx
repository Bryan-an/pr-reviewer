"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { toast } from "sonner";

import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";

import type { FindingActionResult } from "../_actions/finding-actions";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";
import { FindingCard, type FindingWithStatus } from "./finding-card";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FindingsListProps = Readonly<{
  findings: FindingWithStatus[];
  publishFindingAction: (fd: FormData) => Promise<FindingActionResult>;
  ignoreFindingAction: (fd: FormData) => Promise<FindingActionResult>;
  restoreFindingAction: (fd: FormData) => Promise<FindingActionResult>;
}>;

type OptimisticUpdate = { dbId: string; status: FindingStatus };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FindingsList({
  findings,
  publishFindingAction,
  ignoreFindingAction,
  restoreFindingAction,
}: FindingsListProps) {
  const { isGlobalOperationPending, isRestoring, setHasCardPending } = useReviewActions();

  const [optimisticFindings, updateOptimistic] = useOptimistic(
    findings,
    (state: FindingWithStatus[], update: OptimisticUpdate) =>
      state.map((f) => (f.dbId === update.dbId ? { ...f, status: update.status } : f)),
  );

  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Sync card-level pending state to context so footer buttons are disabled
  // while any individual finding action is in flight.
  useEffect(() => {
    setHasCardPending(pendingActions.size > 0);
  }, [pendingActions, setHasCardPending]);

  // When a bulk restore is in flight, project all non-pending findings as
  // pending for an instant optimistic UI. When the transition settles,
  // revalidatePath delivers the canonical DB state and this override disappears.
  const displayFindings = isRestoring
    ? optimisticFindings.map((f) =>
        f.status !== FINDING_STATUS.Pending ? { ...f, status: FINDING_STATUS.Pending } : f,
      )
    : optimisticFindings;

  function markPending(dbId: string) {
    setPendingActions((prev) => new Set(prev).add(dbId));
  }

  function clearPending(dbId: string) {
    setPendingActions((prev) => {
      const next = new Set(prev);
      next.delete(dbId);
      return next;
    });
  }

  function buildFormData(dbId: string): FormData {
    const fd = new FormData();
    fd.append(REVIEW_FORM_FIELD.FindingDbId, dbId);
    return fd;
  }

  function handlePublish(dbId: string) {
    startTransition(async () => {
      markPending(dbId);
      updateOptimistic({ dbId, status: FINDING_STATUS.Published });

      try {
        const result = await publishFindingAction(buildFormData(dbId));

        if (result.success) {
          toast.success("Finding published.");
        } else {
          toast.error("Publish failed. Check your Azure DevOps permissions.");
        }
      } catch {
        toast.error("Publish failed. Check your Azure DevOps permissions.");
      } finally {
        clearPending(dbId);
      }
    });
  }

  function handleIgnore(dbId: string) {
    startTransition(async () => {
      markPending(dbId);
      updateOptimistic({ dbId, status: FINDING_STATUS.Ignored });

      try {
        const result = await ignoreFindingAction(buildFormData(dbId));

        if (result.success) {
          toast.success("Finding ignored.");
        } else {
          toast.error("Failed to ignore finding.");
        }
      } catch {
        toast.error("Failed to ignore finding.");
      } finally {
        clearPending(dbId);
      }
    });
  }

  function handleRestore(dbId: string) {
    startTransition(async () => {
      markPending(dbId);
      updateOptimistic({ dbId, status: FINDING_STATUS.Pending });

      try {
        const result = await restoreFindingAction(buildFormData(dbId));

        if (result.success) {
          toast.success("Finding restored.");
        } else {
          toast.error("Failed to restore finding.");
        }
      } catch {
        toast.error("Failed to restore finding.");
      } finally {
        clearPending(dbId);
      }
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {displayFindings.map((f) => (
        <li key={f.dbId}>
          <FindingCard
            finding={f}
            isPending={pendingActions.has(f.dbId) || isGlobalOperationPending}
            onPublish={() => handlePublish(f.dbId)}
            onIgnore={() => handleIgnore(f.dbId)}
            onRestore={() => handleRestore(f.dbId)}
          />
        </li>
      ))}
    </ul>
  );
}
