import Link from "next/link";

import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { repoBasePath, reposListUrl } from "@/app/repos/_lib/routes";

import { listAzureDevOpsRepositories } from "@/server/azure-devops/repositories";
import { getRepositoryRuleCountsForAdoRepos } from "@/server/db/repositories";

const PAGE_SIZE = 20;

export type RepositoriesListProps = Readonly<{
  org: string;
  decodedOrg: string;
  project: string;
  decodedProject: string;
  q: string;
  sort: string;
  order: string;
  hasRules: boolean;
  page: number;
}>;

export async function RepositoriesList(props: RepositoriesListProps) {
  let repositories: Awaited<ReturnType<typeof listAzureDevOpsRepositories>>["repositories"] = [];
  let error: string | null = null;

  try {
    ({ repositories } = await listAzureDevOpsRepositories({
      org: props.org,
      project: props.project,
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load repositories.";
  }

  const qLower = props.q.trim().toLowerCase();

  const filteredByName =
    qLower === ""
      ? repositories.slice()
      : repositories.filter((r) => r.name.toLowerCase().includes(qLower));

  const ruleCounts = await getRepositoryRuleCountsForAdoRepos({
    org: props.org,
    project: props.project,
    adoRepoIds: filteredByName.map((r) => r.id),
  });

  const filtered = props.hasRules
    ? filteredByName.filter((r) => (ruleCounts[r.id] ?? 0) > 0)
    : filteredByName;

  const sorted = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
  if (props.sort === "name" && props.order === "desc") sorted.reverse();

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(props.page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = sorted.slice(start, end);

  const baseFilterParams = {
    org: props.decodedOrg,
    project: props.decodedProject,
    q: props.q || undefined,
    sort: props.sort || undefined,
    order: props.order || undefined,
    hasRules: props.hasRules || undefined,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Repositories</h2>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{total} total</div>
        </div>

        <form method="GET" className="grid grid-cols-1 gap-2 sm:grid-cols-6">
          <input type="hidden" name={REPOS_FORM_FIELD.Org} value={props.decodedOrg} />
          <input type="hidden" name={REPOS_FORM_FIELD.Project} value={props.decodedProject} />

          <label className="sm:col-span-3">
            <span className="sr-only">Search</span>

            <input
              name={REPOS_FORM_FIELD.Query}
              defaultValue={props.q}
              placeholder="Search repositories…"
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="sm:col-span-1">
            <span className="sr-only">Sort</span>

            <select
              name={REPOS_FORM_FIELD.Order}
              defaultValue={props.order}
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm sm:col-span-1 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <input
              type="checkbox"
              name={REPOS_FORM_FIELD.HasRules}
              value="1"
              defaultChecked={props.hasRules}
              className="h-4 w-4"
            />{" "}
            Has rules
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 sm:col-span-1 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Apply
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Failed to load repositories. {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300">
          <div className="col-span-7">Repository</div>
          <div className="col-span-3">Rules</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {pageItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600 dark:text-zinc-300">No repositories.</div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pageItems.map((r) => {
              const count = ruleCounts[r.id] ?? 0;

              const href = repoBasePath(props.decodedOrg, props.decodedProject, r.id);

              return (
                <li key={r.id} className="grid grid-cols-12 gap-3 px-4 py-4">
                  <div className="col-span-7">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {r.name}
                    </div>

                    <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {r.remoteUrl}
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center">
                    {count > 0 ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        {count} rule{count === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">No rules</span>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <Link
                      className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
                      href={href}
                    >
                      Manage
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Page {safePage + 1} of {totalPages}
        </div>

        <div className="flex items-center gap-3">
          <Link
            className={`text-sm font-medium underline ${
              safePage <= 0
                ? "pointer-events-none text-zinc-400 dark:text-zinc-600"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
            href={reposListUrl({ ...baseFilterParams, page: Math.max(0, safePage - 1) })}
          >
            Prev
          </Link>

          <Link
            className={`text-sm font-medium underline ${
              safePage >= totalPages - 1
                ? "pointer-events-none text-zinc-400 dark:text-zinc-600"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
            href={reposListUrl({
              ...baseFilterParams,
              page: Math.min(totalPages - 1, safePage + 1),
            })}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
