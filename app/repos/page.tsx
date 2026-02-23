import Link from "next/link";
import { cookies } from "next/headers";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { REPOS_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { REPOS_SORT_FIELD, REPOS_SORT_ORDER } from "@/app/repos/_lib/sort";
import { ORG_COOKIE } from "@/app/repos/_lib/cookies";
import { getFirst, getTrimmedFirst, parseNonNegativeIntParam } from "@/lib/utils/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { LoadProjectsForm } from "@/app/repos/_components/load-projects-form";
import { OrgLoadingProvider } from "@/app/repos/_components/org-loading-context";
import { OrgLoadingGuard } from "@/app/repos/_components/org-loading-guard";
import { ProjectsAndRepos } from "@/app/repos/_components/projects-and-repos";
import { ProjectLoadingProvider } from "@/app/repos/_components/project-loading-context";
import { ProjectLoadingGuard } from "@/app/repos/_components/project-loading-guard";
import { setOrgAction } from "@/app/repos/_actions/set-org-action";

type ReposPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ReposPage({ searchParams }: ReposPageProps) {
  const params = await searchParams;

  const jar = await cookies();
  const orgFromCookie = jar.get(ORG_COOKIE)?.value;
  const org = getTrimmedFirst(params[REPOS_FORM_FIELD.Org], orgFromCookie ?? "");

  const project = getTrimmedFirst(params[REPOS_FORM_FIELD.Project]);
  const q = getTrimmedFirst(params[REPOS_FORM_FIELD.Query]);
  const sort = getTrimmedFirst(params[REPOS_SEARCH_PARAM.Sort], REPOS_SORT_FIELD.Name);
  const order = getTrimmedFirst(params[REPOS_FORM_FIELD.Order], REPOS_SORT_ORDER.Asc);
  const hasRules = getFirst(params[REPOS_FORM_FIELD.HasRules]) === "1";
  const page = parseNonNegativeIntParam(getFirst(params[REPOS_SEARCH_PARAM.Page]), 0);

  const decodedOrg = safeDecodeURIComponent(org);
  const decodedProject = safeDecodeURIComponent(project);

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

        <ProjectLoadingProvider>
          <OrgLoadingProvider action={setOrgAction}>
            <ProjectLoadingGuard>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Azure DevOps</CardTitle>
                </CardHeader>

                <CardContent>
                  <LoadProjectsForm defaultOrg={decodedOrg} />

                  {org ? null : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      Enter an Azure DevOps organization to browse projects and repositories.
                    </p>
                  )}
                </CardContent>
              </Card>
            </ProjectLoadingGuard>

            {org ? (
              <OrgLoadingGuard>
                <ProjectsAndRepos
                  org={org}
                  decodedOrg={decodedOrg}
                  project={project}
                  decodedProject={decodedProject}
                  q={q}
                  sort={sort}
                  order={order}
                  hasRules={hasRules}
                  page={page}
                />
              </OrgLoadingGuard>
            ) : null}
          </OrgLoadingProvider>
        </ProjectLoadingProvider>
      </div>
    </>
  );
}
