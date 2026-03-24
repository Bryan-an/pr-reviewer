"use client";

import Link from "next/link";
import { type ReactNode, startTransition, useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { toast } from "sonner";

import { cn } from "@/lib/utils/cn";
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
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleToggle(formData: FormData) {
    startTransition(async () => {
      setOptimisticEnabled(!optimisticEnabled);

      try {
        await toggleAction(formData);
        toast.success(`Rule ${optimisticEnabled ? "disabled" : "enabled"}.`);
      } catch {
        toast.error("Failed to toggle rule.");
      }
    });
  }

  return (
    <li>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold">{rule.title}</div>

                  {optimisticEnabled ? (
                    <Badge>Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}

                  <Badge variant="outline">Order {rule.sortOrder}</Badge>
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

            <Collapsible.Root open={previewOpen} onOpenChange={setPreviewOpen}>
              <Collapsible.Trigger asChild>
                <Button variant="outline" size="sm">
                  Preview
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-200",
                      previewOpen && "rotate-180",
                    )}
                  />
                </Button>
              </Collapsible.Trigger>

              <Collapsible.Content className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                <div className="bg-muted/50 mt-2 rounded-lg border p-4">{children}</div>
              </Collapsible.Content>
            </Collapsible.Root>
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
