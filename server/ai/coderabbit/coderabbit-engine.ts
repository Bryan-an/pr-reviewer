import "server-only";

import { REVIEW_ENGINE } from "@/lib/config/env";
import type { ReviewEngine } from "@/server/ai/engine";
import { parseCodeRabbitPlainOutput } from "@/server/ai/coderabbit/parse-plain-output";
import { runCodeRabbitCli } from "@/server/ai/coderabbit/run-coderabbit-cli";
import { withTempWorktree } from "@/server/git/worktree";

export const coderabbitEngine: ReviewEngine = {
  async run(context) {
    const baseRef = context.pr.targetRefName;
    const headRef = context.pr.sourceRefName;

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
        const { stdout, stderr } = await runCodeRabbitCli({ cwd: worktreeDir, baseBranch });
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
