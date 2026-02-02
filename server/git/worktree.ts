import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

import { execa } from "execa";

function sanitizePathSegment(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

function stableShortId(): string {
  return crypto.randomUUID().slice(0, 8);
}

async function revParse(repoDir: string, ref: string): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", ref], { cwd: repoDir });
  return stdout.trim();
}

export type WithTempWorktreeParams = {
  repoDir: string;
  baseRef: string;
  headRef: string;
  label: {
    org: string;
    project: string;
    repoId: string;
    prId: number;
  };
};

export async function withTempWorktree<T>(
  params: WithTempWorktreeParams,
  fn: (ctx: { worktreeDir: string; baseBranch: string; headBranch: string }) => Promise<T>,
): Promise<T> {
  const runId = stableShortId();
  const baseBranch = `prr/base/${sanitizePathSegment(String(params.label.prId))}/${runId}`;
  const headBranch = `prr/head/${sanitizePathSegment(String(params.label.prId))}/${runId}`;

  const worktreesRoot = path.resolve(
    ".data",
    "worktrees",
    sanitizePathSegment(params.label.org),
    sanitizePathSegment(params.label.project),
    sanitizePathSegment(params.label.repoId),
    sanitizePathSegment(String(params.label.prId)),
  );

  await mkdir(worktreesRoot, { recursive: true });

  const worktreeDir = path.join(worktreesRoot, runId);

  // Ensure the directory does not pre-exist.
  await rm(worktreeDir, { recursive: true, force: true });

  let created = false;

  try {
    const baseSha = await revParse(params.repoDir, params.baseRef);
    const headSha = await revParse(params.repoDir, params.headRef);

    // Create (or move) lightweight local branches for tooling to reference.
    await execa("git", ["branch", "-f", baseBranch, baseSha], { cwd: params.repoDir });
    await execa("git", ["branch", "-f", headBranch, headSha], { cwd: params.repoDir });

    // Create an isolated checkout at the head revision.
    await execa("git", ["worktree", "add", "--force", worktreeDir, headBranch], {
      cwd: params.repoDir,
    });

    created = true;

    return await fn({ worktreeDir, baseBranch, headBranch });
  } finally {
    // Best-effort cleanup.
    if (created) {
      try {
        await execa("git", ["worktree", "remove", "--force", worktreeDir], { cwd: params.repoDir });
      } catch {
        // Ignore cleanup errors.
      }
    }

    try {
      await execa("git", ["branch", "-D", headBranch], { cwd: params.repoDir });
    } catch {
      // Ignore cleanup errors.
    }

    try {
      await execa("git", ["branch", "-D", baseBranch], { cwd: params.repoDir });
    } catch {
      // Ignore cleanup errors.
    }

    try {
      await rm(worktreeDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors.
    }
  }
}
