"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";

type MarkdownRuleEditorProps = Readonly<{
  initial: {
    title: string;
    markdown: string;
    enabled: boolean;
    sortOrder: number;
  };
  submitLabel: string;
  cancelHref: string;
}>;

const MODE = {
  Edit: "edit",
  Preview: "preview",
} as const;

type Mode = (typeof MODE)[keyof typeof MODE];

export function MarkdownRuleEditor({ initial, submitLabel, cancelHref }: MarkdownRuleEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [markdown, setMarkdown] = useState(initial.markdown);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [mode, setMode] = useState<Mode>(MODE.Edit);

  const sortOrderNumber = useMemo(() => {
    const n = Number(sortOrder);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return 0;
    return n;
  }, [sortOrder]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-title">Title</Label>

          <Input
            id="rule-title"
            name={RULE_FORM_FIELD.Title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Error handling standards"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rule-sort-order">Order</Label>

          <Input
            id="rule-sort-order"
            name={RULE_FORM_FIELD.SortOrder}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            inputMode="numeric"
          />

          <span className="text-muted-foreground text-xs">
            Lower numbers apply first. Current:{" "}
            <span className="font-medium">{sortOrderNumber}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="rule-enabled"
          name={RULE_FORM_FIELD.Enabled}
          value="1"
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />

        <Label htmlFor="rule-enabled" className="cursor-pointer">
          Enabled (apply this rule during reviews)
        </Label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rule-markdown">Markdown</Label>

          <div className="bg-muted inline-flex rounded-lg border p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode(MODE.Edit)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === MODE.Edit
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => setMode(MODE.Preview)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === MODE.Preview
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className={`${mode === MODE.Preview ? "hidden lg:block" : "block"}`}>
            <Textarea
              id="rule-markdown"
              name={RULE_FORM_FIELD.Markdown}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your guidelines in Markdown…"
              className="min-h-85"
            />

            <div className="text-muted-foreground mt-2 text-xs">
              Tip: be explicit and actionable. Prefer short sections and bullet points.
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${mode === MODE.Edit ? "hidden lg:block" : "block"}`}
          >
            {markdown.trim() ? (
              <Markdown content={markdown} />
            ) : (
              <div className="text-muted-foreground text-sm">Nothing to preview yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>

        <Button type="submit">{submitLabel}</Button>
      </div>
    </div>
  );
}
