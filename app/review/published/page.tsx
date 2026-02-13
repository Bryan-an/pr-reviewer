import Link from "next/link";
import { ArrowLeftIcon, CircleCheckIcon, CircleXIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirst, parseNonNegativeIntParam } from "@/lib/search-params";

type PublishedPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ReviewPublishedPage({ searchParams }: PublishedPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params.prUrl);
  const publishError = getFirst(params.publishError) === "1";
  const publishedThreads = parseNonNegativeIntParam(getFirst(params.publishedThreads), 0);
  const skippedThreads = parseNonNegativeIntParam(getFirst(params.skippedThreads), 0);
  const totalThreads = parseNonNegativeIntParam(getFirst(params.totalThreads), 0);

  const publishedThreadsLabel = `thread${publishedThreads === 1 ? "" : "s"}`;
  const skippedThreadsLabel = `thread${skippedThreads === 1 ? "" : "s"}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Publish result</CardTitle>
        </CardHeader>

        <CardContent>
          {publishError ? (
            <Alert variant="destructive">
              <CircleXIcon />
              <AlertTitle>Publish failed</AlertTitle>
              <AlertDescription>
                Something went wrong while posting comments. Please generate a new preview and try
                again.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-emerald-200 text-emerald-900 dark:border-emerald-900/50 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400">
              <CircleCheckIcon />
              <AlertTitle>
                Published {publishedThreads} {publishedThreadsLabel}
              </AlertTitle>
              <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                {skippedThreads > 0 && (
                  <>
                    Skipped {skippedThreads} already-posted {skippedThreadsLabel}.{" "}
                  </>
                )}
                Total threads considered: {totalThreads}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter>
          <Button variant="outline" asChild>
            <Link href={prUrl ? `/review?prUrl=${encodeURIComponent(prUrl)}` : "/"}>
              <ArrowLeftIcon />
              {prUrl ? "Back to preview" : "New review"}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
