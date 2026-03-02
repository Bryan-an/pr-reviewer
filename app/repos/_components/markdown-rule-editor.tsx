"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs } from "radix-ui";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { ruleFormSchema, type RuleFormValues } from "@/app/repos/_lib/rule-schema";
import { SHORTCUT_MAP, TOOLBAR_GROUPS } from "@/app/repos/_lib/toolbar-config";
import {
  handleListContinuation,
  handleListIndent,
  INDENT_DIRECTION,
  type FormatResult,
  type SelectionRange,
} from "@/lib/utils/markdown-formatting";

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

const MODE = { Write: "write", Preview: "preview" } as const;
type Mode = (typeof MODE)[keyof typeof MODE];

export function MarkdownRuleEditor({
  initial,
  submitLabel,
  cancelHref,
  formAction,
}: MarkdownRuleEditorProps) {
  const [mode, setMode] = useState<Mode>(MODE.Write);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Synchronously commits the new value to the DOM so setSelectionRange sticks.
  // flushSync prevents the multi-render race that caused the old useLayoutEffect
  // approach to lose the selection.
  const applyResult = useCallback(
    (result: FormatResult) => {
      flushSync(() => {
        form.setValue(RULE_FORM_FIELD.Markdown, result.value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      });

      const el = textareaRef.current;
      if (!el) return;
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
      el.focus();
    },
    [form],
  );

  const applyFormat = useCallback(
    (getResult: (value: string, selection: SelectionRange) => FormatResult) => {
      const el = textareaRef.current;
      if (!el) return;

      const value = form.getValues(RULE_FORM_FIELD.Markdown);
      const selection: SelectionRange = { start: el.selectionStart, end: el.selectionEnd };
      applyResult(getResult(value, selection));
    },
    [form, applyResult],
  );

  // Keyboard shortcuts, list continuation (Enter), and indent/outdent (Tab)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const el = textareaRef.current;
      if (document.activeElement !== el || !el) return;

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd shortcuts (bold, italic, link, inline code)
      if (mod && !e.shiftKey && !e.altKey) {
        const action = SHORTCUT_MAP.get(e.key.toLowerCase());

        if (action) {
          e.preventDefault();
          applyFormat(action);
        }

        return;
      }

      const value = form.getValues(RULE_FORM_FIELD.Markdown);
      const selection: SelectionRange = { start: el.selectionStart, end: el.selectionEnd };

      // Enter — auto-continue lists
      if (e.key === "Enter" && !mod && !e.shiftKey && !e.altKey) {
        const result = handleListContinuation(value, selection);

        if (result) {
          e.preventDefault();
          applyResult(result);
        }

        return;
      }

      // Tab / Shift+Tab — indent/outdent list items
      if (e.key === "Tab" && !mod && !e.altKey) {
        const direction = e.shiftKey ? INDENT_DIRECTION.Outdent : INDENT_DIRECTION.Indent;
        const result = handleListIndent(value, selection, direction);

        if (result) {
          e.preventDefault();
          applyResult(result);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyFormat, applyResult, form]);

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
            name={RULE_FORM_FIELD.Title}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
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
            name={RULE_FORM_FIELD.SortOrder}
            render={({ field }) => {
              const n = Number(field.value);
              const displayNumber = Number.isFinite(n) && Number.isInteger(n) ? n : 0;

              return (
                <FormItem className="flex flex-col gap-2">
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
          name={RULE_FORM_FIELD.Enabled}
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
          name={RULE_FORM_FIELD.Markdown}
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2">
              <FormLabel>Markdown</FormLabel>

              <TooltipProvider>
                <Tabs.Root value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <div className="overflow-hidden rounded-lg border">
                    {/* Tab bar */}
                    <div className="bg-muted/50 flex items-end border-b px-2">
                      <Tabs.List className="flex">
                        <Tabs.Trigger
                          value={MODE.Write}
                          className="text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors"
                        >
                          Write
                        </Tabs.Trigger>

                        <Tabs.Trigger
                          value={MODE.Preview}
                          className="text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors"
                        >
                          Preview
                        </Tabs.Trigger>
                      </Tabs.List>
                    </div>

                    {/* Formatting toolbar — visible only in Write mode */}
                    {mode === MODE.Write && (
                      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
                        {TOOLBAR_GROUPS.map((group, gi) => (
                          <Fragment key={gi}>
                            {gi > 0 && <div className="bg-border mx-1 h-4 w-px" />}
                            {group.map((action) => (
                              <Tooltip key={action.label}>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={action.label}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applyFormat(action.getResult)}
                                  >
                                    {action.icon}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {action.label}
                                  {action.shortcut ? ` (${action.shortcut})` : ""}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    )}

                    {/* Write panel — forceMount keeps textarea in DOM across tab switches */}
                    <Tabs.Content
                      value={MODE.Write}
                      forceMount
                      className="outline-none data-[state=inactive]:hidden"
                    >
                      <FormControl>
                        <Textarea
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            textareaRef.current = el;
                          }}
                          placeholder="Write your guidelines in Markdown…"
                          className="min-h-52 resize-none rounded-none border-0 text-base shadow-none focus-visible:ring-0 md:text-base"
                        />
                      </FormControl>
                    </Tabs.Content>

                    {/* Preview panel — unmounts when inactive (no state to preserve) */}
                    <Tabs.Content value={MODE.Preview} className="min-h-52 p-4 outline-none">
                      {field.value.trim() ? (
                        <Markdown content={field.value} />
                      ) : (
                        <p className="text-muted-foreground text-base">Nothing to preview yet.</p>
                      )}
                    </Tabs.Content>
                  </div>
                </Tabs.Root>
              </TooltipProvider>

              <p className="text-muted-foreground text-xs">
                Tip: be explicit and actionable. Prefer short sections and bullet points.
              </p>

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
