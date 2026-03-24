"use client";

import { type ReactNode, startTransition, useOptimistic } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { toast } from "sonner";

import { repoEditRulePath } from "@/app/repos/_lib/routes";
import { RuleCard } from "@/app/repos/[org]/[project]/[adoRepoId]/_components/rule-card";

type RuleListRule = Readonly<{
  id: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: Date;
}>;

type RuleListProps = Readonly<{
  rules: RuleListRule[];
  ruleContent: Record<string, ReactNode>;
  deleteAction: (ruleId: string) => Promise<void>;
  toggleAction: (formData: FormData) => Promise<void>;
  org: string;
  project: string;
  adoRepoId: string;
}>;

export function RuleList({
  rules,
  ruleContent,
  deleteAction,
  toggleAction,
  org,
  project,
  adoRepoId,
}: RuleListProps) {
  const [optimisticRules, setOptimisticRules] = useOptimistic(rules);
  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  function handleDelete(ruleId: string) {
    startTransition(async () => {
      setOptimisticRules((prev) => prev.filter((r) => r.id !== ruleId));

      try {
        await deleteAction(ruleId);
        toast.success("Rule deleted.");
      } catch {
        toast.error("Failed to delete rule.");
      }
    });
  }

  return (
    <ul ref={animateRef} className="flex flex-col gap-3">
      {optimisticRules.map((rule) => {
        const editHref = repoEditRulePath(org, project, adoRepoId, rule.id);

        return (
          <RuleCard
            key={rule.id}
            rule={rule}
            editHref={editHref}
            toggleAction={toggleAction}
            onDeleteConfirm={() => handleDelete(rule.id)}
          >
            {ruleContent[rule.id]}
          </RuleCard>
        );
      })}
    </ul>
  );
}
