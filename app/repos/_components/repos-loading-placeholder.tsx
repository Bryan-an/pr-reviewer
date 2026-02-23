"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjectLoading } from "./project-loading-context";

const SKELETON_ROWS = 5;

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

      {/* Table skeleton: matches Repository (55%) / Rules (25%) / Action (20%) */}
      <div className="rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[55%]">Repository</TableHead>
              <TableHead className="w-[25%]">Rules</TableHead>
              <TableHead className="w-[20%]">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </TableCell>

                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>

                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
