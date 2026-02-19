"use client";

import type { ReactNode } from "react";

import { useOrgLoading } from "./org-loading-context";
import { LoadingGuard } from "@/components/loading-guard";

type OrgLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function OrgLoadingGuard({ children }: OrgLoadingGuardProps) {
  const { isPending } = useOrgLoading();

  return <LoadingGuard isPending={isPending}>{children}</LoadingGuard>;
}
