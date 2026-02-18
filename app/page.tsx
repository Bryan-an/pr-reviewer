import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTrimmedStringFormField } from "@/lib/form-data";

import { REVIEW_FORM_FIELD } from "./review/_lib/form-fields";
import { reviewUrl } from "./review/_lib/routes";

async function goToReview(formData: FormData) {
  "use server";
  const prUrl = getTrimmedStringFormField(formData, REVIEW_FORM_FIELD.PrUrl);
  redirect(reviewUrl({ prUrl }));
}

export default function Home() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-6 py-10 font-sans">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Azure DevOps PR Reviewer</CardTitle>

          <CardDescription>
            Paste an Azure DevOps pull request URL to generate a local-diff-backed review preview
            using the CodeRabbit CLI.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <form action={goToReview} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={REVIEW_FORM_FIELD.PrUrl}>Pull request URL</Label>

              <Input
                id={REVIEW_FORM_FIELD.PrUrl}
                name={REVIEW_FORM_FIELD.PrUrl}
                placeholder="https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}"
                required
              />
            </div>

            <Button type="submit" className="w-full sm:w-fit">
              Generate preview
            </Button>
          </form>

          <Alert>
            <AlertTitle>Server requirements</AlertTitle>

            <AlertDescription>
              <p>
                Server requires{" "}
                <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                  AZURE_DEVOPS_PAT
                </code>{" "}
                in the environment. Secrets never reach the browser. CodeRabbit CLI must be
                installed and authenticated on the server.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="justify-between">
          <Button variant="link" asChild className="px-0">
            <Link href="/repos">Manage repository rules</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
