# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure DevOps AI PR Reviewer — a Next.js web app that automates pull request reviews. It connects to Azure DevOps, generates local diffs, runs AI analysis (CodeRabbit CLI or stub engine), and publishes structured findings back as PR comment threads.

## Commands

```bash
pnpm dev              # Start dev server (port 3100)
pnpm build            # Production build (also runs as pre-push hook)
pnpm lint             # ESLint
pnpm type-check       # TypeScript check (tsc --noEmit)
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)
```

Prisma commands:

```bash
pnpm prisma migrate dev    # Apply migrations in dev
pnpm prisma generate       # Regenerate Prisma client (output: prisma/generated/prisma/)
```

No test framework is configured yet (vitest and playwright are planned).

## Git Hooks (Husky)

- **pre-commit**: `lint-staged` (ESLint --fix + Prettier on staged files) + `pnpm type-check`
- **commit-msg**: commitlint enforcing Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`)
- **pre-push**: `pnpm build`

Branch prefixes: `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`, `chore/<slug>`, `docs/<slug>`. Squash merge into `main`.

## Architecture

### Layering

```
UI (App Router pages/components)
  → Server boundary (Route Handlers + Server Actions)
    → Domain layer (server/review/)
      → Integrations (server/azure-devops/, server/git/, server/ai/)
      → Persistence (server/db/ + Prisma/SQLite)
```

### Key directories

- `app/` — Next.js App Router routes; route-scoped components in `_components/`, route-scoped logic in `_lib/` (routes, search params, constants)
- `components/` — shared UI: `page-header.tsx` (sticky auto-hide header), `loading-guard.tsx`, `markdown.tsx`
- `components/ui/` — shadcn/ui primitives (do not manually edit) + custom UI components (`highlighted-textarea.tsx`)
- `hooks/` — shared client-side hooks (e.g., `use-auto-hide-header.ts`)
- `lib/` — shared utilities: env config (Zod), validation schemas, URL parsing
- `server/` — all server-only code (`import "server-only"` guardrail); never import from Client Components
- `prisma/` — schema + migrations; generated client at `prisma/generated/prisma/`

### Review pipeline (main data flow)

1. User pastes PR URL on home page → navigates to `/review`
2. `ReviewRunner` (client component) POSTs to `/api/review/run`
3. Route handler checks cache → if miss, runs `runAndPersistReview`:
   - Fetches PR metadata from Azure DevOps SDK
   - Clones/fetches repo locally (cached in `.data/repos/`)
   - Generates unified diff via `git diff` (source of truth, not ADO APIs)
   - Selects AI engine → runs review → normalizes findings via Zod
   - Persists `ReviewRun` + `Finding[]` to SQLite
4. Results displayed in `ReviewResults` → user can publish to Azure DevOps as comment threads

### AI engine interface

Engines implement `ReviewEngine` (defined in `server/ai/engine.ts`). Input: PR metadata + local repo dir + unified diff. Output: structured findings. Implementations: `coderabbit/coderabbit-engine.ts` (preferred), `stub-engine.ts` (testing). Selected via `REVIEW_ENGINE` env var.

### Database models (Prisma/SQLite)

- `ReviewRun` → `Finding[]` (review execution + results)
- `Repository` → `RepoRule[]` (per-repo markdown review rules, managed via `/repos` UI)

## Conventions

- **Navigation links**: use `buttonVariants()` on `<Link>` — not `Button asChild` — for navigation
- **Header actions**: `PageHeader` action links use `variant: "outline"` + `size: "sm"`; headers contain only navigation (e.g., "Back"), not duplicate page actions
- **Table action columns**: center-aligned; action buttons use `variant: "outline"` + `size: "sm"`. For clickable rows, use the stretched link pattern (`relative` on `TableRow`, `static after:absolute after:inset-0 after:content-['']` on the primary `Link`) — the `Link`'s `::after` overlay covers the entire row, so any additional interactive elements in the row must use `relative z-10` to sit above it
- **Grid overlay buttons**: loading-state buttons use `grid grid-cols-1 grid-rows-1 justify-items-center` — without `justify-items-center`, content is left-aligned because grid overrides the button's default `inline-flex justify-center`
- **Loading states**: each page scope uses a context provider + loading guard pattern (`*-loading-context.tsx` + `*-loading-guard.tsx`). URL navigation that should show loading indicators must call `navigateToX()` (which wraps `router.push`/`router.replace` in `startTransition`) — plain `<Link>` bypasses `useTransition` and won't trigger `isPending`. Use `router.replace` for ephemeral changes (filters, sort) and `router.push` for meaningful navigation (pagination). Always pass `{ scroll: false }` to prevent Next.js scroll reset.
- **Loading guard overlays**: to prevent scroll clamp when swapping content for skeleton, use CSS grid stacking — both invisible children and skeleton at `col-start-1 row-start-1` in a `grid grid-cols-1 grid-rows-1` container. Cell height = max of both layers. Use `useLayoutEffect` (not `requestAnimationFrame`) for `scrollIntoView` — it runs before paint, before the browser clamps scroll.
- **DOM ID constants**: shared DOM element IDs for programmatic scrolling live in route-scoped `_lib/dom-ids.ts` files.
- **Tailwind v4 sizing**: 4px multiplier for all utilities — prefer `pt-17`/`h-13` over `pt-[68px]`/`h-[52px]`. Use `supports-backdrop-filter:` over `supports-[backdrop-filter]:`. Linter flags arbitrary values with canonical equivalents.
- **Tailwind v4 custom CSS**: attribute selectors (`[data-slot="..."]`) in `globals.css` are stripped from output — use class selectors for custom CSS scoping. Only Tailwind-recognized `data-*` variants (e.g., `data-[state=open]:`) work in utility classes.
- **Overriding shadcn styles**: when overriding responsive defaults from shadcn components, match the breakpoint — e.g., Textarea has `md:text-sm`, so use `text-base md:text-base` (both) to override at all screen sizes
- **Sticky header offset**: scrollable pages use `pt-17` (68px = 52px header + 16px gap); `scroll-padding-top: 68px` is set globally in `globals.css`
- **Enums**: use `as const` object + derived type + values array for Zod. No magic string unions.
  ```ts
  export const SEVERITY = { Info: "info", Warn: "warn" } as const;
  export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
  ```
- **Naming**: files/folders in `kebab-case`, React exports `PascalCase`, values/functions `camelCase`
- **Validation**: validate at boundaries with Zod; prefer `unknown` + Zod over `any`
- **Forms (react-hook-form)**: use `react-hook-form` + `zodResolver` + shadcn `Form`/`FormField`/`FormControl`/`FormMessage`. Place form schemas in route-scoped `_lib/` files (e.g., `rule-schema.ts`). Component owns the `<form>` element. For progressive enhancement, set `action={formAction}` on `<form>` and `onSubmit={form.handleSubmit(onValid)}` — `onValid` builds a `FormData` manually to match the server action contract. Do not wrap `formAction()` in `startTransition` when the action uses `redirect()`. For loading state in these forms, use local `isPending` state: set `true` in `onValid`, call `Promise.resolve(formAction(fd)).catch(...)` — filter out `NEXT_REDIRECT` digest errors (redirect rejects the client promise but navigation proceeds), reset `isPending` and show `toast.error()` for real failures. Wrap form fields in a `div` with `inert={isPending || undefined}` + `opacity-50` + `transition-opacity` to disable interaction during submission; keep the button row outside this wrapper since it has its own pending states (grid overlay spinner + disabled Cancel link)
- **Server-only**: modules under `server/` must include `import "server-only"` and never be imported by Client Components
- **Radix primitives**: import from `"radix-ui"` monorepo (e.g., `import { Collapsible } from "radix-ui"`), not individual `@radix-ui/react-*` packages. For one-time use, import primitives directly — only install shadcn wrappers when the component will be reused across the app
- **Optimistic updates**: use React 19 `useOptimistic` inside `startTransition`. Server actions must call `revalidatePath()` after mutations so the canonical state settles correctly. Never use `redirect()` in server actions consumed by optimistic flows — it throws `NEXT_REDIRECT` which gets caught by `try/catch`, producing false error toasts
- **Animated collapsible**: use Radix `Collapsible` + `tw-animate-css` classes (`data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden` on Content). Put visual styling (`bg-muted/50`, `border`, `p-4`) on an inner `<div>`, not on Content itself — mixing `overflow-hidden` with border/padding causes visual glitches during height animation
- **Destructive confirmations**: use shadcn `AlertDialog` (not `window.confirm()`). Use uncontrolled pattern — `AlertDialogAction` auto-closes via Radix internals, no `useState` needed. Pass `variant="destructive"` to `AlertDialogAction`
- **Server Component error handling**: pages calling external APIs (Azure DevOps) should wrap calls in `try/catch`, log with `logger.error()`, and return an inline error UI with a "Back" link — don't let errors propagate to the error boundary
- **Tailwind Typography**: register via `@plugin "@tailwindcss/typography"` in `globals.css`. Override `--tw-prose-*` vars on `.prose` selector (not `:root`) — the plugin sets defaults directly on `.prose`, and a direct declaration beats an inherited one regardless of layers. Keep `.prose` overrides unlayered to win over the plugin's layered output
- **Markdown rendering**: `components/markdown.tsx` uses `prose max-w-none` (base = 16px) + `rehype-highlight` (sync). Prose token colors mapped to design system in `globals.css`. Use `rehype-highlight` (not Shiki) — Shiki is async and incompatible with `"use client"` components. Callers should not pass `text-sm` or `text-muted-foreground` — prose handles sizing and body color via `--tw-prose-body`
- **Markdown editor**: `markdown-rule-editor.tsx` uses `HighlightedTextarea` (transparent textarea over highlighted `<pre><code>` backdrop) for live syntax highlighting. Formatting utilities live in `lib/utils/markdown-formatting.ts`. Textarea selection/cursor positioning uses `flushSync` (from `react-dom`) + `setSelectionRange` — not `useLayoutEffect` + ref, which breaks when `form.setValue` with `shouldValidate` triggers multiple renders. List indentation uses 4 spaces (not 2) — CommonMark requires indent >= parent marker width (3 for ordered `1. `, 2 for bullet `- `); 4 spaces is universally safe
- **highlight.js theme**: a single unified GitHub Light / Dark Dimmed hljs theme in `globals.css` serves both prose code blocks and the markdown editor overlay. Must be unlayered CSS to override prose's layered `pre code` color rules. Tokens shared with the markdown grammar (`.hljs-code`, `.hljs-bullet`, `.hljs-quote`, `.hljs-link`) are split from their original groups so they can have markdown-friendly styles without affecting other tokens in the same group
- **highlight.js imports**: use tree-shaken `highlight.js/lib/core` + register only needed languages (not the full bundle). Added as a direct dependency because pnpm strict isolation blocks transitive imports via `rehype-highlight`
- **Dark mode**: uses `@media (prefers-color-scheme: dark)` only — no `.dark` class toggle. This means `prose-invert` cannot be used (it requires `.dark` class). Instead, prose vars reference design system tokens that automatically swap in the dark media query
- **Package manager**: pnpm only — do not use npm or yarn

## Environment Variables

Required: `AZURE_DEVOPS_PAT`

Optional: `REPOS_DIR`, `CODERABBIT_BIN`, `CODERABBIT_TIMEOUT_MS`, `REVIEW_ENGINE` (`coderabbit` | `stub`), `DATABASE_URL` (default: `file:./pr-reviewer.db`), `LOG_LEVEL`

Env schema defined in `lib/config/env.ts` with Zod validation.

## Claude Code Tooling

- `.claude/rules/` — project conventions enforced contextually (architecture, enums, naming, git workflow, etc.)
- `.claude/skills/` — auto-invoked skills for Next.js App Router, server/client components, Prisma, shadcn/ui, TDD, and debugging
- `.mcp.json` — MCP server config (shadcn component registry)
