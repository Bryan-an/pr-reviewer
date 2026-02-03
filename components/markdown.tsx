import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type MarkdownProps = Readonly<{
  content: string;
  className?: string;
}>;

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  a: ({ children, href }) => (
    <a
      className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-50"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    if (isBlock) return <code className="font-mono">{children}</code>;

    return (
      <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        {children}
      </code>
    );
  },
};

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
