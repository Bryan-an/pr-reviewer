"use client";

import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

type ReposErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ReposError({ reset }: ReposErrorProps) {
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

        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>
            Unable to load repository data. Please verify your Azure DevOps access and try again.
          </AlertDescription>
        </Alert>

        <div>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </>
  );
}
