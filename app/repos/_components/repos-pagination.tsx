"use client";

import { Button } from "@/components/ui/button";
import { reposListUrl } from "@/app/repos/_lib/routes";
import { useReposFilterLoading } from "./repos-filter-loading-context";

type ReposPaginationProps = Readonly<{
  currentPage: number;
  totalPages: number;
  baseFilterParams: {
    org: string;
    project: string;
    q?: string;
    sort?: string;
    order?: string;
    hasRules?: boolean;
  };
}>;

export function ReposPagination({
  currentPage,
  totalPages,
  baseFilterParams,
}: ReposPaginationProps) {
  const { isPending, navigateToRepos } = useReposFilterLoading();

  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;

  function handlePrev() {
    if (!hasPrev) return;
    const prevPage = currentPage - 1;

    navigateToRepos(
      reposListUrl({ ...baseFilterParams, page: prevPage === 0 ? undefined : prevPage }),
    );
  }

  function handleNext() {
    if (!hasNext) return;
    navigateToRepos(reposListUrl({ ...baseFilterParams, page: currentPage + 1 }));
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-muted-foreground text-sm">
        Page {currentPage + 1} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev || isPending} onClick={handlePrev}>
          Prev
        </Button>

        <Button variant="outline" size="sm" disabled={!hasNext || isPending} onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
