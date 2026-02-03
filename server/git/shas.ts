import "server-only";

import { execa } from "execa";

import { toOriginRemoteTrackingRef } from "@/server/git/refs";

async function revParse(repoDir: string, ref: string): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", ref], { cwd: repoDir });
  return stdout.trim();
}

export async function resolveBaseAndHeadShas(params: {
  repoDir: string;
  targetRefName: string;
  sourceRefName: string;
}): Promise<{ baseSha: string; headSha: string }> {
  const base = toOriginRemoteTrackingRef(params.targetRefName);
  const head = toOriginRemoteTrackingRef(params.sourceRefName);

  const refspecs = [base.fetchRefspec, head.fetchRefspec].filter(
    (value): value is string => typeof value === "string",
  );

  if (refspecs.length > 0) {
    await execa("git", ["fetch", "--no-tags", "origin", ...refspecs], { cwd: params.repoDir });
  }

  const baseSha = await revParse(params.repoDir, base.ref);
  const headSha = await revParse(params.repoDir, head.ref);

  return { baseSha, headSha };
}
