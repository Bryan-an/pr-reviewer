"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logging/logger";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { deleteRepoRule, getRepoRuleById } from "@/server/db/repo-rules";

type DeleteRuleContext = {
  repositoryId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function deleteRuleAction(context: DeleteRuleContext, ruleId: string) {
  const { repositoryId, org, project, adoRepoId } = context;

  const existing = await getRepoRuleById({ id: ruleId });

  if (!existing || existing.repositoryId !== repositoryId) {
    throw new Error("Rule does not belong to this repository.");
  }

  try {
    await deleteRepoRule({ id: ruleId });
  } catch (err) {
    logger.error(err, "[deleteRule] failed");
    throw err;
  }

  revalidatePath(repoBasePath(org, project, adoRepoId));
}
