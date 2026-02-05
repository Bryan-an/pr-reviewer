import { listAzureDevOpsProjects } from "@/server/azure-devops/projects";

import {
  RepositoriesList,
  type RepositoriesListProps,
} from "@/app/repos/_components/repositories-list";

export type ProjectsAndReposProps = RepositoriesListProps;

export async function ProjectsAndRepos(props: ProjectsAndReposProps) {
  let projects: Awaited<ReturnType<typeof listAzureDevOpsProjects>>["projects"] = [];
  let projectError: string | null = null;

  try {
    ({ projects } = await listAzureDevOpsProjects({ org: props.org, top: 200, skip: 0 }));
  } catch (err) {
    projectError = err instanceof Error ? err.message : "Failed to load projects.";
  }

  const projectSelected = props.project.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Project</div>

          {projectError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              Failed to load projects. {projectError}
            </div>
          ) : null}

          <form method="GET" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="org" value={props.decodedOrg} />

            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">Project</span>

              <select
                name="project"
                defaultValue={props.decodedProject}
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                required
              >
                <option value="" disabled>
                  Select a project…
                </option>
                {projects
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Browse repos
            </button>
          </form>

          {projectSelected ? null : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Select a project to list its repositories.
            </p>
          )}
        </div>
      </div>

      {projectSelected ? <RepositoriesList {...props} /> : null}
    </div>
  );
}
