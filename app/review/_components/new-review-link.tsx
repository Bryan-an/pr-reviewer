"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

import { useReviewActions } from "./review-actions-context";

export function NewReviewLink() {
  const { isAnyPending } = useReviewActions();

  if (isAnyPending) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "pointer-events-none opacity-50",
        )}
        aria-disabled="true"
      >
        New review
      </span>
    );
  }

  return (
    <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/">
      New review
    </Link>
  );
}
