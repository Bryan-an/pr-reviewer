"use client";

import { useLayoutEffect, type ReactNode } from "react";

import { REPOS_SECTION_ID } from "@/app/repos/_lib/dom-ids";

import { useReposFilterLoading } from "./repos-filter-loading-context";
import { ReposTableSkeleton } from "./repos-table-skeleton";

type ReposFilterLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function ReposFilterLoadingGuard({ children }: ReposFilterLoadingGuardProps) {
  const { isPending } = useReposFilterLoading();

  useLayoutEffect(() => {
    if (isPending) {
      document
        .getElementById(REPOS_SECTION_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isPending]);

  if (!isPending) return children;

  return (
    <div className="grid grid-cols-1 grid-rows-1">
      <div className="invisible col-start-1 row-start-1 flex flex-col gap-4">{children}</div>

      <div className="col-start-1 row-start-1 flex flex-col gap-4">
        <ReposTableSkeleton />
      </div>
    </div>
  );
}
