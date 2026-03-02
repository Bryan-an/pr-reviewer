"use client";

import * as React from "react";
import hljs from "highlight.js/lib/core";
import markdown from "highlight.js/lib/languages/markdown";

import { cn } from "@/lib/utils/cn";

hljs.registerLanguage("markdown", markdown);

type HighlightedTextareaProps = React.ComponentProps<"textarea"> & {
  language?: string;
};

/**
 * A textarea with a syntax-highlighted backdrop. The textarea text is rendered
 * transparent so the user sees the colored highlight layer beneath it, while
 * still typing into a native textarea (preserving caret, selection, scroll,
 * and all keyboard behavior).
 *
 * Uses CSS grid stacking (same pattern as loading-guard overlays in this
 * codebase) so both layers participate in intrinsic sizing.
 */
function HighlightedTextarea({
  className,
  language = "markdown",
  value,
  onScroll,
  ref,
  ...props
}: HighlightedTextareaProps) {
  const preRef = React.useRef<HTMLPreElement>(null);

  // Produce highlighted HTML. hljs.highlight is synchronous — safe in useMemo.
  // Append a trailing newline so the <pre> always has the same line count as
  // the textarea when the last line is empty.
  //
  // Safety: hljs.highlight escapes all HTML in the input and only emits <span>
  // elements with class attributes. No user-controlled HTML is passed through.
  const highlighted = React.useMemo(() => {
    const code = typeof value === "string" ? value : "";
    return hljs.highlight(code + "\n", { language, ignoreIllegals: true }).value;
  }, [value, language]);

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    const pre = preRef.current;

    if (pre) {
      pre.scrollTop = e.currentTarget.scrollTop;
      pre.scrollLeft = e.currentTarget.scrollLeft;
    }

    onScroll?.(e);
  }

  // Shared text-geometry styles that must match exactly between the two layers.
  const sharedStyles = cn(
    "w-full px-3 py-2 text-base font-mono leading-normal min-h-16",
    className,
  );

  return (
    <div className="grid grid-cols-1 grid-rows-1">
      {/* Backdrop: highlighted code, no pointer events, hidden overflow */}
      <pre
        ref={preRef}
        aria-hidden
        className={cn(
          sharedStyles,
          "col-start-1 row-start-1",
          "pointer-events-none overflow-hidden select-none",
          "wrap-break-word whitespace-pre-wrap",
        )}
      >
        <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>

      {/* Transparent textarea on top — captures input and shows caret */}
      <textarea
        ref={ref}
        data-slot="textarea"
        value={value}
        onScroll={handleScroll}
        className={cn(
          sharedStyles,
          "col-start-1 row-start-1",
          "relative z-10",
          "field-sizing-content",
          "caret-foreground bg-transparent text-transparent",
          "placeholder:text-muted-foreground",
          "transition-[color,box-shadow] outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      />
    </div>
  );
}

export { HighlightedTextarea };
