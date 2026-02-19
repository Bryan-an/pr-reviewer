"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type LoadingGuardProps = Readonly<{
  isPending: boolean;
  children: ReactNode;
}>;

export function LoadingGuard({ isPending, children }: LoadingGuardProps) {
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
