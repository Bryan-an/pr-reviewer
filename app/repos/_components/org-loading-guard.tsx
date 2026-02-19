"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { useOrgLoading } from "./org-loading-context";

type OrgLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function OrgLoadingGuard({ children }: OrgLoadingGuardProps) {
  const { isPending } = useOrgLoading();

  return (
    <div
      className={cn("transition-opacity", isPending && "opacity-50")}
      inert={isPending || undefined}
      aria-busy={isPending}
    >
      {children}
    </div>
  );
}
