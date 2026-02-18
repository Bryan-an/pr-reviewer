import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/form-data";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { getFirst, getTrimmedFirst, parseNonNegativeIntParam } from "@/lib/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { ProjectsAndRepos } from "@/app/repos/_components/projects-and-repos";

type ReposPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const ORG_COOKIE = "ado_org";

async function setOrgAction(formData: FormData) {
  "use server";
  const org = getTrimmedStringFormField(formData, REPOS_FORM_FIELD.Org);
  if (!org) redirect("/repos");

  const jar = await cookies();
  jar.set(ORG_COOKIE, org, { sameSite: "lax", httpOnly: true });

  redirect(`/repos?org=${encodeURIComponent(org)}`);
}

export default async function ReposPage({ searchParams }: ReposPageProps) {
  const params = await searchParams;

  const jar = await cookies();
  const orgFromCookie = jar.get(ORG_COOKIE)?.value;
  const org = getTrimmedFirst(params.org, orgFromCookie ?? "");

  const project = getTrimmedFirst(params.project);
  const q = getTrimmedFirst(params.q);
  const sort = getTrimmedFirst(params.sort, "name");
  const order = getTrimmedFirst(params.order, "asc");
  const hasRules = getFirst(params.hasRules) === "1";
  const page = parseNonNegativeIntParam(getFirst(params.page), 0);

  const decodedOrg = safeDecodeURIComponent(org);
  const decodedProject = safeDecodeURIComponent(project);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Repository rules
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Browse Azure DevOps repositories and manage optional Markdown rules used during PR review.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Azure DevOps</div>

          <form action={setOrgAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">Organization</span>

              <input
                name={REPOS_FORM_FIELD.Org}
                defaultValue={decodedOrg}
                placeholder="my-org"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                required
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Load projects
            </button>
          </form>
        </div>

        {org ? null : (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Enter an Azure DevOps organization to browse projects and repositories.
          </div>
        )}
      </div>

      {org ? (
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
      ) : null}

      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        <Link className="underline" href="/">
          Back to review
        </Link>
      </div>
    </div>
  );
}
