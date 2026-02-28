"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Markdown } from "@/components/markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { ruleFormSchema, type RuleFormValues } from "@/app/repos/_lib/rule-schema";

type MarkdownRuleEditorProps = Readonly<{
  initial: {
    title: string;
    markdown: string;
    enabled: boolean;
    sortOrder: number;
  };
  submitLabel: string;
  cancelHref: string;
  formAction: (formData: FormData) => void | Promise<void>;
}>;

const MODE = {
  Edit: "edit",
  Preview: "preview",
} as const;

type Mode = (typeof MODE)[keyof typeof MODE];

export function MarkdownRuleEditor({
  initial,
  submitLabel,
  cancelHref,
  formAction,
}: MarkdownRuleEditorProps) {
  const [mode, setMode] = useState<Mode>(MODE.Edit);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      title: initial.title,
      markdown: initial.markdown,
      enabled: initial.enabled,
      sortOrder: String(initial.sortOrder),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  function onValid(values: RuleFormValues) {
    const fd = new FormData();
    fd.set(RULE_FORM_FIELD.Title, values.title);
    fd.set(RULE_FORM_FIELD.Markdown, values.markdown);

    const trimmed = values.sortOrder.trim();
    const sortOrderNum = trimmed === "" ? 0 : Number(trimmed);
    fd.set(RULE_FORM_FIELD.SortOrder, String(sortOrderNum));

    if (values.enabled) {
      fd.set(RULE_FORM_FIELD.Enabled, "1");
    }

    void formAction(fd);
  }

  return (
    <Form {...form}>
      <form
        action={formAction}
        onSubmit={form.handleSubmit(onValid)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel>Title</FormLabel>

                <FormControl>
                  <Input {...field} placeholder="e.g. Error handling standards" />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => {
              const n = Number(field.value);
              const displayNumber = Number.isFinite(n) && Number.isInteger(n) ? n : 0;

              return (
                <FormItem className="flex flex-col gap-1.5">
                  <FormLabel>Order</FormLabel>

                  <FormControl>
                    <Input {...field} inputMode="numeric" />
                  </FormControl>

                  <span className="text-muted-foreground text-xs">
                    Lower numbers apply first. Current:{" "}
                    <span className="font-medium">{displayNumber}</span>
                  </span>

                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2">
              <FormControl>
                <Checkbox
                  name={field.name}
                  value="1"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
              </FormControl>

              <FormLabel className="cursor-pointer">
                Enabled (apply this rule during reviews)
              </FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="markdown"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <FormLabel>Markdown</FormLabel>

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
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Write your guidelines in Markdown…"
                      className="min-h-85"
                    />
                  </FormControl>

                  <div className="text-muted-foreground mt-2 text-xs">
                    Tip: be explicit and actionable. Prefer short sections and bullet points.
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-4 ${mode === MODE.Edit ? "hidden lg:block" : "block"}`}
                >
                  {field.value.trim() ? (
                    <Markdown content={field.value} />
                  ) : (
                    <div className="text-muted-foreground text-sm">Nothing to preview yet.</div>
                  )}
                </div>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>

          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Form>
  );
}
