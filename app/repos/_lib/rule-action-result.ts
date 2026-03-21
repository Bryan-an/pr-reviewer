export type RuleFormData = {
  title: string;
  markdown: string;
  enabled: boolean;
  sortOrder: number;
};

export type RuleActionResult =
  | { success: true; redirectTo: string }
  | { success: false; message: string };
