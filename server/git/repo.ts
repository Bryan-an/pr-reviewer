import "server-only";

import path from "node:path";
import { mkdir, stat } from "node:fs/promises";

import { execa } from "execa";

import { getEnv } from "@/lib/config/env";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizePathSegment(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

function getReposRootDir(): string {
  const { REPOS_DIR } = getEnv();
  return REPOS_DIR ? path.resolve(REPOS_DIR) : path.resolve(".data", "repos");
}

export async function ensureRepoCheckedOut(params: {
  org: string;
  project: string;
  repoId: string;
  remoteUrl: string;
}): Promise<{ repoDir: string }> {
  const repoDir = path.join(
    getReposRootDir(),
    sanitizePathSegment(params.org),
    sanitizePathSegment(params.project),
    sanitizePathSegment(params.repoId),
  );

  await mkdir(repoDir, { recursive: true });

  const gitDir = path.join(repoDir, ".git");
  const hasGit = await pathExists(gitDir);

  if (hasGit) {
    // Ensure origin URL is correct (remoteUrl can include auth in other setups; we rely on the configured URL).
    await execa("git", ["remote", "set-url", "origin", params.remoteUrl], { cwd: repoDir });
  } else {
    // Clone into the existing directory (created above).
    await execa("git", ["clone", "--no-tags", "--filter=blob:none", params.remoteUrl, "."], {
      cwd: repoDir,
    });
  }

  // Keep refs up to date.
  await execa("git", ["fetch", "--prune", "--no-tags", "origin"], { cwd: repoDir });

  return { repoDir };
}

export async function generateUnifiedDiff(params: {
  repoDir: string;
  targetRefName: string;
  sourceRefName: string;
}): Promise<string> {
  // Fetch the refs explicitly in case they're not in the default fetch refspec.
  await execa("git", ["fetch", "--no-tags", "origin", params.targetRefName, params.sourceRefName], {
    cwd: params.repoDir,
  });

  const diffRange = `${params.targetRefName}...${params.sourceRefName}`;

  const { stdout } = await execa(
    "git",
    ["diff", "--unified=3", "--no-color", "--no-ext-diff", diffRange],
    { cwd: params.repoDir },
  );

  return stdout;
}
