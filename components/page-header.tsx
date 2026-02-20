"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { useAutoHideHeader } from "@/hooks/use-auto-hide-header";
import { ScrollToTop } from "@/components/scroll-to-top";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageHeaderProps = Readonly<{
  title: string;
  actions?: ReactNode;
  maxWidth?: "3xl" | "5xl";
  showScrollToTop?: boolean;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  actions,
  maxWidth = "5xl",
  showScrollToTop = false,
}: PageHeaderProps) {
  const { isVisible } = useAutoHideHeader();

  return (
    <>
      <header
        className={cn(
          "bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-sm",
          "border-border fixed inset-x-0 top-0 z-50 h-13 border-b",
          "transition-transform duration-300 ease-in-out",
          "motion-reduce:translate-y-0 motion-reduce:transition-none",
          !isVisible && "-translate-y-full",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-full items-center justify-between gap-4 px-6",
            maxWidth === "3xl" ? "max-w-3xl" : "max-w-5xl",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-foreground hover:text-foreground/70 shrink-0 text-sm font-semibold tracking-tight transition-colors"
            >
              PR Reviewer
            </Link>

            <span className="text-border select-none" aria-hidden="true">
              /
            </span>

            <span className="text-muted-foreground min-w-0 truncate text-sm font-medium">
              {title}
            </span>
          </div>

          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      {showScrollToTop ? <ScrollToTop visible={!isVisible} /> : null}
    </>
  );
}
