"use client";

import type { ReactNode } from "react";

import { LoadingGuard } from "@/components/loading-guard";
import { useReposFilterLoading } from "./repos-filter-loading-context";

type ReposFilterLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function ReposFilterLoadingGuard({ children }: ReposFilterLoadingGuardProps) {
  const { isPending } = useReposFilterLoading();
  return <LoadingGuard isPending={isPending}>{children}</LoadingGuard>;
}
