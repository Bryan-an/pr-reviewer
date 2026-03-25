import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { RuleEditorSkeleton } from "@/app/repos/_components/rule-editor-skeleton";

export default function NewRuleLoading() {
  return (
    <>
      <PageHeader
        title="New rule"
        showScrollToTop
        actions={<Skeleton className="h-8 w-14 rounded-md" />}
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        {/* Title block */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">New rule</h1>
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Card with editor skeleton */}
        <Card>
          <CardContent>
            <RuleEditorSkeleton />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
