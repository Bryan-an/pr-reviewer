import {
  BoldIcon,
  Code2Icon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
} from "lucide-react";

import {
  applyCodeBlock,
  applyInlineFormat,
  applyLinePrefix,
  applyLink,
  type FormatResult,
  type SelectionRange,
} from "@/lib/utils/markdown-formatting";

export type ToolbarAction = {
  icon: React.ReactNode;
  label: string;
  shortcut: string | null;
  shortcutKey: string | null;
  getResult: (value: string, selection: SelectionRange) => FormatResult;
};

export const TOOLBAR_GROUPS: ToolbarAction[][] = [
  [
    {
      icon: <BoldIcon />,
      label: "Bold",
      shortcut: "\u2318B",
      shortcutKey: "b",
      getResult: (v, s) => applyInlineFormat(v, s, "**", "bold text"),
    },
    {
      icon: <ItalicIcon />,
      label: "Italic",
      shortcut: "\u2318I",
      shortcutKey: "i",
      getResult: (v, s) => applyInlineFormat(v, s, "_", "italic text"),
    },
  ],
  [
    {
      icon: <Heading2Icon />,
      label: "Heading",
      shortcut: null,
      shortcutKey: null,
      getResult: (v, s) => applyLinePrefix(v, s, "## "),
    },
  ],
  [
    {
      icon: <LinkIcon />,
      label: "Link",
      shortcut: "\u2318K",
      shortcutKey: "k",
      getResult: applyLink,
    },
    {
      icon: <CodeIcon />,
      label: "Inline code",
      shortcut: "\u2318E",
      shortcutKey: "e",
      getResult: (v, s) => applyInlineFormat(v, s, "`", "code"),
    },
    {
      icon: <Code2Icon />,
      label: "Code block",
      shortcut: null,
      shortcutKey: null,
      getResult: applyCodeBlock,
    },
  ],
  [
    {
      icon: <ListIcon />,
      label: "Bulleted list",
      shortcut: null,
      shortcutKey: null,
      getResult: (v, s) => applyLinePrefix(v, s, "- "),
    },
    {
      icon: <ListOrderedIcon />,
      label: "Numbered list",
      shortcut: null,
      shortcutKey: null,
      getResult: (v, s) => applyLinePrefix(v, s, "1. "),
    },
  ],
];

export const SHORTCUT_MAP = new Map(
  TOOLBAR_GROUPS.flat()
    .filter((a): a is ToolbarAction & { shortcutKey: string } => a.shortcutKey !== null)
    .map((a) => [a.shortcutKey, a.getResult]),
);
