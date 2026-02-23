"use client";

import type { ReactNode } from "react";

import { useReposFilterLoading } from "./repos-filter-loading-context";
import { ReposTableSkeleton } from "./repos-table-skeleton";

type ReposFilterLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function ReposFilterLoadingGuard({ children }: ReposFilterLoadingGuardProps) {
  const { isPending } = useReposFilterLoading();

  if (!isPending) return children;

  return <ReposTableSkeleton />;
}
