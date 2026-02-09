---
paths:
  - "**/*.{ts,tsx}"
---

# Enum Pattern: No Magic String Unions

Define enums as `as const` objects, derive the union type, and export a values array for Zod.

```ts
// GOOD
export const SEVERITY = { Info: "info", Warn: "warn", Error: "error" } as const;
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
const severityValues = [SEVERITY.Info, SEVERITY.Warn, SEVERITY.Error] as const;
export const schema = z.object({ severity: z.enum(severityValues) });

// BAD — no inline string unions or z.enum(["a", "b"])
```
