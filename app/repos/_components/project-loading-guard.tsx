"use client";

import type { ReactNode } from "react";

import { useProjectLoading } from "./project-loading-context";
import { LoadingGuard } from "@/components/loading-guard";

type ProjectLoadingGuardProps = Readonly<{
  children: ReactNode;
}>;

export function ProjectLoadingGuard({ children }: ProjectLoadingGuardProps) {
  const { isPending } = useProjectLoading();

  return <LoadingGuard isPending={isPending}>{children}</LoadingGuard>;
}
