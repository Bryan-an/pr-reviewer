# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure DevOps AI PR Reviewer — a Next.js web app that automates pull request reviews. It connects to Azure DevOps, generates local diffs, runs AI analysis (CodeRabbit CLI or stub engine), and publishes structured findings back as PR comment threads.

## Commands

```bash
pnpm dev              # Start dev server
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
- `components/ui/` — shadcn/ui components (do not manually edit)
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
- **Loading states**: each page scope uses a context provider + loading guard pattern (`*-loading-context.tsx` + `*-loading-guard.tsx`). URL navigation that should show loading indicators must call `navigateToX()` (which wraps `router.push` in `startTransition`) — plain `<Link>` bypasses `useTransition` and won't trigger `isPending`
- **Tailwind v4 sizing**: 4px multiplier for all utilities — prefer `pt-17`/`h-13` over `pt-[68px]`/`h-[52px]`. Use `supports-backdrop-filter:` over `supports-[backdrop-filter]:`. Linter flags arbitrary values with canonical equivalents.
- **Sticky header offset**: scrollable pages use `pt-17` (68px = 52px header + 16px gap); `scroll-padding-top: 68px` is set globally in `globals.css`
- **Enums**: use `as const` object + derived type + values array for Zod. No magic string unions.
  ```ts
  export const SEVERITY = { Info: "info", Warn: "warn" } as const;
  export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
  ```
- **Naming**: files/folders in `kebab-case`, React exports `PascalCase`, values/functions `camelCase`
- **Validation**: validate at boundaries with Zod; prefer `unknown` + Zod over `any`
- **Server-only**: modules under `server/` must include `import "server-only"` and never be imported by Client Components
- **Package manager**: pnpm only — do not use npm or yarn

## Environment Variables

Required: `AZURE_DEVOPS_PAT`

Optional: `REPOS_DIR`, `CODERABBIT_BIN`, `CODERABBIT_TIMEOUT_MS`, `REVIEW_ENGINE` (`coderabbit` | `stub`), `DATABASE_URL` (default: `file:./pr-reviewer.db`), `LOG_LEVEL`

Env schema defined in `lib/config/env.ts` with Zod validation.

## Claude Code Tooling

- `.claude/rules/` — project conventions enforced contextually (architecture, enums, naming, git workflow, etc.)
- `.claude/skills/` — auto-invoked skills for Next.js App Router, server/client components, Prisma, shadcn/ui, TDD, and debugging
- `.mcp.json` — MCP server config (shadcn component registry)
