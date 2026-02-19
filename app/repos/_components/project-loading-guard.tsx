"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { useProjectLoading } from "./project-loading-context";

type ProjectLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function ProjectLoadingGuard({ children }: ProjectLoadingGuardProps) {
  const { isPending } = useProjectLoading();

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
