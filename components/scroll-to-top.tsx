"use client";

import { ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleClick() {
  const prefersReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

  globalThis.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? "instant" : "smooth",
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScrollToTopProps = Readonly<{
  visible: boolean;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScrollToTop({ visible }: ScrollToTopProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Scroll to top"
      tabIndex={visible ? 0 : -1}
      onClick={handleClick}
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-sm",
        "fixed right-6 bottom-6 z-40 shadow-md",
        "transition-all duration-300 ease-in-out",
        "motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUpIcon />
    </Button>
  );
}
