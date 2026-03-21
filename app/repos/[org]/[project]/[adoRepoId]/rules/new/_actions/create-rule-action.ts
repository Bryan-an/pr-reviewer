"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logging/logger";
import type { RuleActionResult, RuleFormData } from "@/app/repos/_lib/rule-action-result";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { createRepoRule } from "@/server/db/repo-rules";

type CreateRuleContext = {
  repositoryId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function createRuleAction(
  context: CreateRuleContext,
  data: RuleFormData,
): Promise<RuleActionResult> {
  const { repositoryId, org, project, adoRepoId } = context;

  try {
    await createRepoRule({
      repositoryId,
      title: data.title,
      markdown: data.markdown,
      enabled: data.enabled,
      sortOrder: data.sortOrder,
    });
  } catch (err) {
    logger.error(err, "[createRule] failed");
    return { success: false, message: "Failed to create rule. Please try again." };
  }

  const redirectTo = repoBasePath(org, project, adoRepoId);
  revalidatePath(redirectTo);

  return { success: true, redirectTo };
}
