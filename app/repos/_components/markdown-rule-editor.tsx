"use client";

import { useMemo, useState } from "react";

import { Markdown } from "@/components/markdown";
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">Title</span>

          <input
            name={RULE_FORM_FIELD.Title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Error handling standards"
            className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">Order</span>

          <input
            name={RULE_FORM_FIELD.SortOrder}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            inputMode="numeric"
            className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Lower numbers apply first. Current:{" "}
            <span className="font-medium">{sortOrderNumber}</span>
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-50">
        <input
          type="checkbox"
          name={RULE_FORM_FIELD.Enabled}
          value="1"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />{" "}
        Enabled (apply this rule during reviews)
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Markdown</div>

          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setMode(MODE.Edit)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === MODE.Edit
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => setMode(MODE.Preview)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === MODE.Preview
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className={`${mode === MODE.Preview ? "hidden lg:block" : "block"}`}>
            <textarea
              name={RULE_FORM_FIELD.Markdown}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your guidelines in Markdown…"
              className="min-h-[340px] w-full rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />

            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Tip: be explicit and actionable. Prefer short sections and bullet points.
            </div>
          </div>

          <div
            className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${
              mode === MODE.Edit ? "hidden lg:block" : "block"
            }`}
          >
            {markdown.trim() ? (
              <Markdown className="text-sm text-zinc-700 dark:text-zinc-300" content={markdown} />
            ) : (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Nothing to preview yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <a
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Cancel
        </a>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
