import "server-only";

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { REVIEW_ENGINE } from "@/lib/config/env";
import type { ReviewEngine } from "@/server/ai/engine";
import { parseCodeRabbitPlainOutput } from "@/server/ai/coderabbit/parse-plain-output";
import { runCodeRabbitCli } from "@/server/ai/coderabbit/run-coderabbit-cli";
import { getRepositoryByUnique } from "@/server/db/repositories";
import { listEnabledRepoRules } from "@/server/db/repo-rules";
import { withTempWorktree } from "@/server/git/worktree";

function stableRuleFilename(index: number, ruleId: string): string {
  const prefix = String(index).padStart(3, "0");
  const safeId = ruleId.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}_${safeId}.md`;
}

function buildRuleFileContents(params: {
  org: string;
  project: string;
  adoRepoId: string;
  title: string;
  sortOrder: number;
  ruleId: string;
  markdown: string;
}): string {
  const header = [
    `# PR Reviewer rule: ${params.title}`,
    "",
    `- Repository: ${params.org}/${params.project}/${params.adoRepoId}`,
    `- Rule ID: ${params.ruleId}`,
    `- Order: ${params.sortOrder}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = params.markdown.trim() ? `${params.markdown.trim()}\n` : "";
  return `${header}${body}`.trimEnd() + "\n";
}

export const coderabbitEngine: ReviewEngine = {
  async run(context) {
    const baseRef = context.pr.targetRefName;
    const headRef = context.pr.sourceRefName;

    const repo = await getRepositoryByUnique({
      org: context.pr.org,
      project: context.pr.project,
      adoRepoId: context.pr.repoId,
    });

    const enabledRules = repo ? await listEnabledRepoRules({ repositoryId: repo.id }) : [];

    const result = await withTempWorktree(
      {
        repoDir: context.repoDir,
        baseRef,
        headRef,
        label: {
          org: context.pr.org,
          project: context.pr.project,
          repoId: context.pr.repoId,
          prId: context.pr.prId,
        },
      },
      async ({ worktreeDir, baseBranch }) => {
        let configFiles: string[] | undefined;

        if (enabledRules.length > 0) {
          const rulesDirRel = path.join(".pr-reviewer", "rules");
          const rulesDirAbs = path.join(worktreeDir, rulesDirRel);

          await mkdir(rulesDirAbs, { recursive: true });

          configFiles = [];

          for (const [index, rule] of enabledRules.entries()) {
            const filename = stableRuleFilename(index, rule.id);
            const relPath = path.join(rulesDirRel, filename);
            const absPath = path.join(worktreeDir, relPath);

            const contents = buildRuleFileContents({
              org: context.pr.org,
              project: context.pr.project,
              adoRepoId: context.pr.repoId,
              title: rule.title,
              sortOrder: rule.sortOrder,
              ruleId: rule.id,
              markdown: rule.markdown,
            });

            await writeFile(absPath, contents, "utf8");
            configFiles.push(relPath);
          }
        }

        const { stdout, stderr } = await runCodeRabbitCli({
          cwd: worktreeDir,
          baseBranch,
          ...(configFiles ? { configFiles } : {}),
        });

        const text = [stdout, stderr].filter(Boolean).join("\n").trim();
        const findings = parseCodeRabbitPlainOutput({ text, changedFiles: context.changedFiles });
        return { text, findings };
      },
    );

    return {
      engineName: REVIEW_ENGINE.Coderabbit,
      rawOutput: result.text,
      findings: result.findings,
    };
  },
};
