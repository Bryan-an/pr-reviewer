"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { reposListUrl } from "@/app/repos/_lib/routes";
import { safeDecodeURIComponent } from "@/lib/utils/url";

type RepoErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function RepoError({ reset }: RepoErrorProps) {
  const params = useParams<{ org: string; project: string; adoRepoId: string }>();
  const org = safeDecodeURIComponent(params.org);
  const project = safeDecodeURIComponent(params.project);
  const adoRepoId = safeDecodeURIComponent(params.adoRepoId);

  const backHref = reposListUrl({ org, project });

  return (
    <>
      <PageHeader
        title="Repository"
        showScrollToTop
        actions={
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={backHref}>
            Back
          </Link>
        }
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Repository</h1>

          <p className="text-muted-foreground text-sm">
            {org} · {project} · <span className="font-mono text-xs">{adoRepoId}</span>
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>
            Unable to load repository details. Please verify your Azure DevOps access and try again.
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
