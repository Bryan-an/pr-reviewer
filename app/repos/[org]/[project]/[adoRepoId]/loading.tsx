import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

export default function RepoRulesLoading() {
  return (
    <>
      <PageHeader
        title={<Skeleton className="h-4 w-32" />}
        showScrollToTop
        actions={<Skeleton className="h-8 w-14 rounded-md" />}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        {/* Repo identity block */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Repository</h1>
              <Skeleton className="h-4 w-56" />
            </div>

            {/* "New rule" button placeholder (default size = h-9) */}
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>

          {/* Remote URL */}
          <Skeleton className="h-3 w-64" />
        </div>

        {/* Rules section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Rules</h2>

            <span className="text-muted-foreground text-xs">
              Enabled rules are applied during PR reviews for this repo.
            </span>
          </div>

          {/* Skeleton rule cards */}
          <ul className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Card>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-18 rounded-full" />
                          </div>

                          <Skeleton className="h-3 w-36" />
                        </div>

                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-16 rounded-md" />
                          <Skeleton className="h-8 w-11 rounded-md" />
                          <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                      </div>

                      {/* Preview button */}
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
