"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useProjectLoading } from "./project-loading-context";
import { ReposTableSkeleton } from "./repos-table-skeleton";

export function ReposLoadingPlaceholder() {
  const { isPending } = useProjectLoading();

  if (!isPending) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title + count */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>

        {/* Filter form skeleton: matches the 5-column grid (search + order + hasRules) */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <Skeleton className="h-9 sm:col-span-3" />
          <Skeleton className="h-9 sm:col-span-1" />
          <Skeleton className="h-9 sm:col-span-1" />
        </div>
      </div>

      <ReposTableSkeleton />
    </div>
  );
}
