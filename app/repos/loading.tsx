import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

export default function ReposLoading() {
  return (
    <>
      <PageHeader
        title="Repository rules"
        showScrollToTop
        actions={
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/">
            Back
          </Link>
        }
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Repository rules</h1>

          <p className="text-muted-foreground text-sm">
            Browse Azure DevOps repositories and manage optional Markdown rules used during PR
            review.
          </p>
        </div>

        {/* Azure DevOps org form card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Azure DevOps</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>

              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Project card with placeholder project buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />

              <ul className="flex flex-col gap-1.5">
                {Array.from({ length: 6 }, (_, i) => (
                  <li key={i}>
                    <Skeleton className="h-10 w-full rounded-md" />
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-muted-foreground text-sm">
              Select a project to list its repositories.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
