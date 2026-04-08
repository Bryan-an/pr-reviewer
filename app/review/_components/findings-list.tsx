"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { toast } from "sonner";

import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";

import type { FindingActionResult } from "../_actions/finding-actions";
import { FindingCard, type FindingWithStatus } from "./finding-card";
import { useReviewActions } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FindingsListProps = Readonly<{
  findings: FindingWithStatus[];
  publishFindingAction: (findingId: string) => Promise<FindingActionResult>;
  ignoreFindingAction: (findingId: string) => Promise<FindingActionResult>;
  restoreFindingAction: (findingId: string) => Promise<FindingActionResult>;
}>;

type OptimisticUpdate = { id: string; status: FindingStatus };

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
      state.map((f) => (f.id === update.id ? { ...f, status: update.status } : f)),
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

  function markPending(id: string) {
    setPendingActions((prev) => new Set(prev).add(id));
  }

  function clearPending(id: string) {
    setPendingActions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      markPending(id);
      updateOptimistic({ id, status: FINDING_STATUS.Published });

      try {
        const result = await publishFindingAction(id);

        if (result.success) {
          toast.success("Finding published.");
        } else {
          toast.error("Publish failed. Check your Azure DevOps permissions.");
        }
      } catch {
        toast.error("Publish failed. Check your Azure DevOps permissions.");
      } finally {
        clearPending(id);
      }
    });
  }

  function handleIgnore(id: string) {
    startTransition(async () => {
      markPending(id);
      updateOptimistic({ id, status: FINDING_STATUS.Ignored });

      try {
        const result = await ignoreFindingAction(id);

        if (result.success) {
          toast.success("Finding ignored.");
        } else {
          toast.error("Failed to ignore finding.");
        }
      } catch {
        toast.error("Failed to ignore finding.");
      } finally {
        clearPending(id);
      }
    });
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      markPending(id);
      updateOptimistic({ id, status: FINDING_STATUS.Pending });

      try {
        const result = await restoreFindingAction(id);

        if (result.success) {
          toast.success("Finding restored.");
        } else {
          toast.error("Failed to restore finding.");
        }
      } catch {
        toast.error("Failed to restore finding.");
      } finally {
        clearPending(id);
      }
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {displayFindings.map((f) => (
        <li key={f.id}>
          <FindingCard
            finding={f}
            isPending={pendingActions.has(f.id) || isGlobalOperationPending}
            onPublish={() => handlePublish(f.id)}
            onIgnore={() => handleIgnore(f.id)}
            onRestore={() => handleRestore(f.id)}
          />
        </li>
      ))}
    </ul>
  );
}
