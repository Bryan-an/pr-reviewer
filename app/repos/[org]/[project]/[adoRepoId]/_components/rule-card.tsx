"use client";

import Link from "next/link";
import { type ReactNode, useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteRuleDialog } from "@/app/repos/[org]/[project]/[adoRepoId]/_components/delete-rule-dialog";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";

type RuleCardRule = Readonly<{
  id: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: Date;
}>;

type RuleCardProps = Readonly<{
  rule: RuleCardRule;
  editHref: string;
  toggleAction: (formData: FormData) => Promise<void>;
  onDeleteConfirm: () => void;
  children: ReactNode;
}>;

export function RuleCard({
  rule,
  editHref,
  toggleAction,
  onDeleteConfirm,
  children,
}: RuleCardProps) {
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(rule.enabled);

  async function handleToggle(formData: FormData) {
    setOptimisticEnabled(!optimisticEnabled);

    try {
      await toggleAction(formData);
    } catch {
      toast.error("Failed to toggle rule.");
    }
  }

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold">{rule.title}</div>

                  {optimisticEnabled ? (
                    <Badge>enabled</Badge>
                  ) : (
                    <Badge variant="outline">disabled</Badge>
                  )}

                  <span className="text-muted-foreground text-xs">order {rule.sortOrder}</span>
                </div>

                <div className="text-muted-foreground text-xs">
                  Updated {new Date(rule.updatedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <form action={handleToggle}>
                  <input type="hidden" name={RULE_FORM_FIELD.Id} value={rule.id} />
                  <input
                    type="hidden"
                    name={RULE_FORM_FIELD.Enabled}
                    value={optimisticEnabled ? "0" : "1"}
                  />

                  <ToggleSubmitButton enabled={optimisticEnabled} />
                </form>

                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={editHref}
                >
                  Edit
                </Link>

                <DeleteRuleDialog ruleTitle={rule.title} onConfirm={onDeleteConfirm} />
              </div>
            </div>

            <details className="bg-muted/50 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">Preview</summary>

              <div className="mt-3">{children}</div>
            </details>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function ToggleSubmitButton({ enabled }: Readonly<{ enabled: boolean }>) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {enabled ? "Disable" : "Enable"}
    </Button>
  );
}
