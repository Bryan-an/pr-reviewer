import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditRuleLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
      {/* Title block */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Card with editor skeleton */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Title + Order inputs (2-column grid) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-9 w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>

            {/* Enabled checkbox */}
            <div className="flex flex-row items-center gap-2">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-4 w-56" />
            </div>

            {/* Markdown editor */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />

              <div className="overflow-hidden rounded-lg border">
                {/* Tab bar */}
                <div className="bg-muted/50 flex items-end gap-0 border-b px-2">
                  <Skeleton className="my-2 h-5 w-12 rounded-sm" />
                  <Skeleton className="my-2 ml-2 h-5 w-16 rounded-sm" />
                </div>

                {/* Toolbar: 4 groups [2, 1, 3, 2] matching TOOLBAR_GROUPS */}
                <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
                  {Array.from({ length: 2 }, (_, i) => (
                    <Skeleton key={i} className="size-7 rounded-md" />
                  ))}
                  <div className="bg-border mx-1 h-4 w-px" />
                  <Skeleton className="size-7 rounded-md" />
                  <div className="bg-border mx-1 h-4 w-px" />
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="size-7 rounded-md" />
                  ))}
                  <div className="bg-border mx-1 h-4 w-px" />
                  {Array.from({ length: 2 }, (_, i) => (
                    <Skeleton key={i} className="size-7 rounded-md" />
                  ))}
                </div>

                {/* Textarea area */}
                <Skeleton className="min-h-52 w-full rounded-none" />
              </div>

              <Skeleton className="h-3 w-72" />
            </div>

            {/* Button row */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Skeleton className="h-9 w-full rounded-md sm:w-20" />
              <Skeleton className="h-9 w-full rounded-md sm:w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
