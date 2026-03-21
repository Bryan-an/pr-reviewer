"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logging/logger";
import type { RuleActionResult, RuleFormData } from "@/app/repos/_lib/rule-action-result";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { getRepoRuleById, updateRepoRule } from "@/server/db/repo-rules";

type UpdateRuleContext = {
  repositoryId: string;
  ruleId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function updateRuleAction(
  context: UpdateRuleContext,
  data: RuleFormData,
): Promise<RuleActionResult> {
  const { repositoryId, ruleId, org, project, adoRepoId } = context;

  try {
    const current = await getRepoRuleById({ id: ruleId });

    if (!current || current.repositoryId !== repositoryId) {
      return { success: false, message: "Rule not found or does not belong to this repository." };
    }

    await updateRepoRule({
      id: ruleId,
      title: data.title,
      markdown: data.markdown,
      enabled: data.enabled,
      sortOrder: data.sortOrder,
    });
  } catch (err) {
    logger.error(err, "[updateRule] failed");
    return { success: false, message: "Failed to update rule. Please try again." };
  }

  const redirectTo = repoBasePath(org, project, adoRepoId);
  revalidatePath(redirectTo);

  return { success: true, redirectTo };
}
