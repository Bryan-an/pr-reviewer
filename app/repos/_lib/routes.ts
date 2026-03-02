import { buildUrl, joinPathSegments } from "@/lib/utils/url";
import { REPOS_FORM_FIELD } from "./form-fields";
import { REPOS_SEARCH_PARAM, RULE_SEARCH_PARAM } from "./search-params";

export function repoBasePath(org: string, project: string, repoId: string): string {
  return joinPathSegments("/repos", org, project, repoId);
}

export function repoManageUrl(
  org: string,
  project: string,
  repoId: string,
  fromUrl: string,
): string {
  return buildUrl(repoBasePath(org, project, repoId), {
    [RULE_SEARCH_PARAM.From]: fromUrl,
  });
}

export function repoNewRulePath(org: string, project: string, repoId: string): string {
  return joinPathSegments("/repos", org, project, repoId, "rules", "new");
}

export function repoNewRuleErrorUrl(
  org: string,
  project: string,
  repoId: string,
  errorCode: string,
): string {
  return buildUrl(repoNewRulePath(org, project, repoId), {
    [RULE_SEARCH_PARAM.Error]: errorCode,
  });
}

export function repoEditRulePath(
  org: string,
  project: string,
  repoId: string,
  ruleId: string,
): string {
  return joinPathSegments("/repos", org, project, repoId, "rules", ruleId, "edit");
}

export function repoEditRuleErrorUrl(
  org: string,
  project: string,
  repoId: string,
  ruleId: string,
  errorCode: string,
): string {
  return buildUrl(repoEditRulePath(org, project, repoId, ruleId), {
    [RULE_SEARCH_PARAM.Error]: errorCode,
  });
}

export function reposListUrl(params?: {
  org?: string;
  project?: string;
  q?: string;
  sort?: string;
  order?: string;
  hasRules?: boolean;
  page?: number;
}): string {
  return buildUrl("/repos", {
    [REPOS_FORM_FIELD.Org]: params?.org,
    [REPOS_FORM_FIELD.Project]: params?.project,
    [REPOS_FORM_FIELD.Query]: params?.q,
    [REPOS_SEARCH_PARAM.Sort]: params?.sort,
    [REPOS_FORM_FIELD.Order]: params?.order,
    [REPOS_FORM_FIELD.HasRules]: params?.hasRules ? "1" : undefined,
    [REPOS_SEARCH_PARAM.Page]: params?.page,
  });
}
