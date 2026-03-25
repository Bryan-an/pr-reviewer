# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure DevOps AI PR Reviewer — a Next.js web app that automates pull request reviews. It connects to Azure DevOps, generates local diffs, runs AI analysis (CodeRabbit + Claude Code in parallel, or stub engine), and publishes structured findings back as PR comment threads. Output must be actionable: specific files/locations, proposed fixes, no generic advice. Core workflow is complete (review → preview → publish with per-finding actions); keep scope incremental as new features are added.

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

No test framework is configured.

First-time setup: `mkdir -p .data && pnpm prisma migrate dev` — SQLite won't create parent directories, so `.data/` must exist before the app can create the database file. Also run `pnpm prisma migrate dev` after pulling new migrations — `prisma generate` (via `postinstall`) updates the client but does NOT apply migrations to the database, causing `P2022` column-not-found errors.

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
- `lib/` — shared utilities: env config (Zod), validation schemas, URL parsing, universal logger (`lib/logging/logger.ts` — pino, works in both client and server; `pino.stdSerializers.err` for proper error serialization; `pino-pretty` transport in dev/server only)
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
4. Results displayed in `ReviewResults` → user can publish to Azure DevOps as line-anchored comment threads (one thread per finding). Individual finding actions (publish/ignore/restore) with optimistic UI (`useOptimistic`), bulk publish all pending findings, or bulk restore all non-pending findings back to pending

### AI engine interface

Engines implement `ReviewEngine` (defined in `server/ai/engine.ts`). Input: PR metadata + local repo dir + unified diff. Output: structured findings (including optional `lineStart`/`lineEnd` for line-level positioning). Implementations: `coderabbit/coderabbit-engine.ts` (general quality review), `claude-code/claude-code-engine.ts` (rule compliance via Claude Code CLI), `stub-engine.ts` (testing). Selected via `REVIEW_ENGINE` env var (`coderabbit` default, `claude-code`, `stub`).

### Parallel engine execution

By default (`REVIEW_ENGINE=coderabbit`), both CodeRabbit and Claude Code engines run in parallel via `Promise.allSettled` (`server/ai/run-engines-in-parallel.ts`). Claude Code self-gates: if the repo has no enabled rules, it returns empty findings (not an error). Each finding is stamped with `sourceName` by the orchestrator. After parallel execution, AI-powered deduplication (`server/ai/dedup/deduplicate-findings.ts`) merges near-duplicate findings across engines. If one engine fails, partial results from the other are used. `AllEnginesFailedError` is thrown only when ALL engines fail.

### Claude Code engine

Invokes `claude -p` (headless mode) with `--output-format json --max-turns 1 --system-prompt`. Repo rules are injected into the user prompt (title as heading + full markdown body, no numbered labels — findings must describe problems directly without referencing rule names/numbers). Output is a JSON array of message objects; the result is extracted by finding the element with `type: "result"`. CLI runner: `server/ai/claude-code/run-claude-code-cli.ts`. Shared CLI diagnostics (output summarization, error logging): `server/ai/cli-diagnostics.ts`. Key gotcha: `--output-format json` produces a JSON array (`[{...}]`), not NDJSON — the parser must handle both formats. Post-processing: `prependVerifyPreamble()` prepends "Verify each finding against the current code and only fix it if needed." to every recommendation — this is added programmatically in the engine, not by the AI. The system prompt instructs the AI to produce self-contained recommendations starting with `In @{filePath} around lines {lineStart} - {lineEnd}, ...` so each recommendation is actionable without cross-referencing other fields.

### CodeRabbit output parsing

`server/ai/coderabbit/parse-plain-output.ts` converts CodeRabbit plain-text output into structured findings. Key design: `wrapCodeLikeBlocksAsMarkdown()` detects unfenced code/diff blocks and wraps them in markdown fences before storage. Diff detection uses look-ahead to bridge over blank lines, bare `+`/`-` markers, and space-prefixed context lines. Changes here must preserve: (1) markdown lists not being treated as diffs, (2) context lines included in diff fences, (3) code blocks not stealing diff lines.

### Database models (Prisma/SQLite)

- `ReviewRun` → `Finding[]` (review execution + results). Each `Finding` has a `status` column (`pending`/`published`/`ignored`) — see `FindingStatus` in `lib/validation/finding-status.ts`. `sourceName` (optional) tracks which engine produced the finding (displayed in UI, not published to ADO threads). `codeSnippet` (optional) stores raw diff lines extracted from the parsed diff at review time (`server/review/extract-code-snippet.ts`). Pipeline enrichment — not in `FindingSchema` (which validates AI engine output only). Rendered as fenced `diff` code blocks via `rehype-highlight`. `adoThreadId` (optional `Int`) stores the ADO thread ID after publishing — used by restore to close threads
- `Repository` → `RepoRule[]` (per-repo markdown review rules, managed via `/repos` UI)

### Azure DevOps thread anchoring

Publishing lives in `server/review/publish/`: `format-threads.ts` (pure formatting → `PublishableThread[]`), `publish-review.ts` (orchestration: fetch PR, format, deduplicate via HTML-comment markers, publish loop with fallback, reopen closed threads on re-publish), `close-threads.ts` (domain layer for closing/bulk-closing threads on restore), `threads.ts` in `server/azure-devops/` (ADO API calls — `createPullRequestThread`, `closePullRequestThread`, `reopenPullRequestThread`, `listPullRequestThreads`). `formatFinding()` renders message as a blockquote and recommendation as a fenced code block (via `adoFencedBlock()` in `ado-markdown.ts`) — ADO renders fenced blocks with a built-in copy button. `adoFencedBlock` uses dynamic fence length (like `adoInlineCode`) to safely handle recommendations containing backtick runs. Thread types: general findings (unscoped, no file path) and per-finding (file-scoped, line-anchored). Idempotency uses `<!-- pr-reviewer:thread:... -->` markers embedded in comment content. Individual finding actions (publish/ignore/restore) are server actions in `app/review/_actions/finding-actions.ts`; bulk publish is in `app/review/_actions/publish-action.ts` (skips already-published and ignored findings); bulk restore-all is in `app/review/_actions/restore-all-action.ts` (resets published/ignored findings to pending and closes ADO threads for published findings via best-effort bulk marker scan). Finding status is persisted via `server/db/findings.ts`.

### ADO thread lifecycle

ADO threads cannot be deleted — only their status can be changed. The full publish-restore-republish cycle: **publish** creates thread (Active) and stores `adoThreadId` on the finding → **restore** closes the thread (best-effort, non-fatal) → **re-publish** detects the closed thread via marker scan and reopens it (Active). Single restore uses stored `adoThreadId` directly (`closeSingleThread`); bulk restore uses `listPullRequestThreads` + marker matching (`closeBulkThreadsByMarkers` in `server/review/publish/close-threads.ts`). Thread IDs are persisted at publish time for both newly created and already-existing (skipped) threads via `persistThreadId` in `publish-review.ts`.

Key invariant: `processedFindings` in `PublishReviewResult` drives which findings the caller marks as `published` in the DB. Only add to `processedFindings` after a successful ADO operation (thread created or reopened) — never after a failed one, or findings will be marked `published` while the ADO thread is still closed/missing.

Line-anchored PR comment threads require **both** `threadContext` (file path + positions) and `pullRequestThreadContext` (`changeTrackingId` + `iterationContext` from the iterations API). Key gotchas:

- `CommentPosition.offset` is `int32` — use `2_147_483_647` for "end of line", not `Number.MAX_SAFE_INTEGER`
- `threadContext.filePath` must have a leading `/`
- `changeTrackingId` is per-file, resolved via `getPullRequestIterationChanges()` — see `server/azure-devops/iterations.ts`
- Iteration context fetch is best-effort (try/catch) — failure degrades to general threads, doesn't block publishing

## Conventions

- **Navigation links**: use `buttonVariants()` on `<Link>` — not `Button asChild` — for navigation
- **Header actions**: `PageHeader` action links use `variant: "outline"` + `size: "sm"`; headers contain only navigation (e.g., "Back"), not duplicate page actions
- **Table action columns**: center-aligned; action buttons use `variant: "outline"` + `size: "sm"`. For clickable rows, use the stretched link pattern (`relative` on `TableRow`, `static after:absolute after:inset-0 after:content-['']` on the primary `Link`) — the `Link`'s `::after` overlay covers the entire row, so any additional interactive elements in the row must use `relative z-10` to sit above it
- **Loading-state buttons**: use `LoadingButton` from `@/components/ui/loading-button` — wraps shadcn `Button` with `loading` + optional `loadingText` props; uses grid overlay internally for zero layout shift. Omit `loadingText` for compact buttons (spinner-only). Do not use the manual grid overlay pattern directly
- **Loading states**: each page scope uses a context provider + loading guard pattern (`*-loading-context.tsx` + `*-loading-guard.tsx`). URL navigation that should show loading indicators must call `navigateToX()` (which wraps `router.push`/`router.replace` in `startTransition`) — plain `<Link>` bypasses `useTransition` and won't trigger `isPending`. Use `router.replace` for ephemeral changes (filters, sort) and `router.push` for meaningful navigation (pagination). Always pass `{ scroll: false }` to prevent Next.js scroll reset.
- **Loading skeletons (`loading.tsx`)**: for pages with async Server Component data (e.g., ADO API calls), add a `loading.tsx` in the same route segment. Reuse real components for static parts — `loading.tsx` is a Server Component that can render Client Components (e.g., `<PageHeader title="Edit rule" showScrollToTop actions={<Skeleton ... />} />`). Use `Skeleton` only for parts that depend on async data. Match skeleton dimensions to real component sizes (`h-8` for `sm` buttons, `h-9` for default inputs). Existing skeletons: `repos-table-skeleton.tsx`, `repos-loading-placeholder.tsx`, `rule-editor-skeleton.tsx` (shared by new/edit rule `loading.tsx`)
- **Loading guard overlays**: to prevent scroll clamp when swapping content for skeleton, use CSS grid stacking — both invisible children and skeleton at `col-start-1 row-start-1` in a `grid grid-cols-1 grid-rows-1` container. Cell height = max of both layers. Use `useLayoutEffect` (not `requestAnimationFrame`) for `scrollIntoView` — it runs before paint, before the browser clamps scroll.
- **DOM ID constants**: shared DOM element IDs for programmatic scrolling live in route-scoped `_lib/dom-ids.ts` files.
- **Return navigation (`from` param)**: when a detail page needs a "Back" link to a list page that preserves filters/pagination, encode the list URL as a `?from=<encoded URL>` search param on the detail link. The detail page strips fragments (`.split("#")[0]`), validates with a regex route boundary (`/^\/repos(\?|\/|$)/` + no `..`), and appends `#section-id` for scroll targeting. This is the only approach that is SSR-compatible, per-tab isolated, and requires no client components. Route builders that use `from` go in `_lib/routes.ts`; the search param key goes in `_lib/search-params.ts`
- **Route builder ordering**: in `_lib/routes.ts`, declare path primitives first (`repoBasePath`, `repoNewRulePath`), then parameterized URL builders that wrap them (`repoManageUrl`), then list URL builders (`reposListUrl`). Callers should appear after the functions they call
- **Route builder usage**: always use route builders from `_lib/routes.ts` for `redirect()` calls and `<Link>` hrefs — no hardcoded path strings, even for simple routes like `/repos`
- **Tailwind v4 sizing**: 4px multiplier for all utilities — prefer `pt-17`/`h-13` over `pt-[68px]`/`h-[52px]`. Use `supports-backdrop-filter:` over `supports-[backdrop-filter]:`. Linter flags arbitrary values with canonical equivalents.
- **Tailwind v4 custom CSS**: attribute selectors (`[data-slot="..."]`) in `globals.css` are stripped from output — use class selectors for custom CSS scoping. Only Tailwind-recognized `data-*` variants (e.g., `data-[state=open]:`) work in utility classes.
- **Overriding shadcn styles**: when overriding responsive defaults from shadcn components, match the breakpoint — e.g., Textarea has `md:text-sm`, so use `text-base md:text-base` (both) to override at all screen sizes
- **Sticky header offset**: scrollable pages use `pt-17` (68px = 52px header + 16px gap); `scroll-padding-top: 68px` is set globally in `globals.css`
- **Enums**: use `as const` object + derived type + values array for Zod. No magic string unions.
  ```ts
  export const SEVERITY = { Info: "info", Warn: "warn" } as const;
  export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
  ```
- **UI label casing**: hardcoded UI labels (badges, buttons, status text) use sentence case — `Enabled`, `Disabled`, `Order`, `Ignored`. Dynamic data values (`severity`, `category`) keep their source casing
- **Conditional classes**: use `cn()` for conditional class composition — not template literals. Prefer `cn("base", condition && "active")` over `` `base ${condition ? "active" : ""}` ``
- **Naming**: files/folders in `kebab-case`, React exports `PascalCase`, values/functions `camelCase`
- **Validation**: validate at boundaries with Zod; prefer `unknown` + Zod over `any`
- **Forms (react-hook-form)**: use `react-hook-form` + `zodResolver` + shadcn `Form`/`FormField`/`FormControl`/`FormMessage`. Place form schemas in route-scoped `_lib/` files (e.g., `rule-schema.ts`). Component owns the `<form>` element — use `onSubmit={form.handleSubmit(onValid)}` only (no `action` prop). `onValid` converts validated form values to a typed data object and calls the server action directly (no `FormData` intermediary). Handle the discriminated union result: `toast.success()` + `router.push()` on success, `toast.error()` on failure. For loading state, use local `isPending` state: set `true` in `onValid`, reset on failure only (navigation handles success). Wrap form fields in a `div` with `inert={isPending || undefined}` + `opacity-50` + `transition-opacity` to disable interaction during submission; keep the button row outside this wrapper since it has its own pending states (`LoadingButton` spinner + disabled Cancel link)
- **Numeric-only inputs**: use `type="text"` + `inputMode="numeric"` + `pattern="[0-9]*"` + `onChange` filtering (`value.replaceAll(/\D/g, "")`) — never `type="number"` (scroll quirks, allows `e`/`+`/`-`)
- **Server-only**: modules under `server/` must include `import "server-only"` and never be imported by Client Components
- **Logging**: use `logger` from `@/lib/logging/logger` everywhere (client + server). Never use `console.log`/`console.error`/`console.warn`. The logger uses pino — on the server it outputs structured JSON; on the client, the bundler swaps to `pino/browser` which delegates to `console.*`. Error-first signature: `logger.error(err, "message")`
- **Integration layer error logging**: functions in `server/azure-devops/`, `server/git/`, and `server/ai/` that call external APIs must wrap calls in try/catch, log with `logger.error(err, "descriptive message")`, and re-throw — the integration handles observability, callers handle error UX (Alert, toast, fallback)
- **Server action error logging**: all server actions must log errors with `logger.error(err, "[actionName] failed")`. Actions returning discriminated unions: catch + log + return `{ success: false }`. Actions that throw (native `<form action={...}>` consumption): catch + log + re-throw to preserve the error boundary contract
- **Server action results**: return discriminated union result types (`{ success: true, ...data } | { success: false, message }`) — never use `redirect()` in server actions consumed by client components. For actions that navigate on success, include `redirectTo` in the success result and let the client call `router.push()`. This avoids `NEXT_REDIRECT` digest issues and enables toast feedback. `redirect()` is acceptable only in server actions consumed via native `<form action={...}>` without client-side `.catch()`/`try-catch`
- **Server action signatures**: use `FormData` parameter only when the action is consumed via native `<form action={...}>` (enables `useFormStatus()` for pending state). When calling a server action imperatively (e.g., inside `startTransition` with `useOptimistic`), use typed arguments directly — no `FormData` intermediary. `.bind(null, context)` works with both patterns
- **Toast feedback**: use Sonner `toast.success()`/`toast.error()` for action results. Always show success toasts — not just errors. Keep messages concise and state-aware (e.g., `"Rule enabled."` / `"Rule disabled."`)
- **Radix primitives**: import from `"radix-ui"` monorepo (e.g., `import { Collapsible } from "radix-ui"`), not individual `@radix-ui/react-*` packages. For one-time use, import primitives directly — only install shadcn wrappers when the component will be reused across the app
- **Optimistic updates**: use React 19 `useOptimistic` inside `startTransition`. Server actions must call `revalidatePath()` after mutations so the canonical state settles correctly. Never use `redirect()` in server actions consumed by optimistic flows — it throws `NEXT_REDIRECT` which gets caught by `try/catch`, producing false error toasts. No manual revert needed in `catch` — `useOptimistic` auto-reverts to the canonical prop when the transition ends (whether normally or by throw). For bulk operations affecting many items (e.g., restore-all), derive the optimistic display from a context flag (`isRestoring → displayFindings`) rather than extending the `useOptimistic` reducer — simpler and avoids discriminated union complexity
- **Review interaction blocking**: `ReviewActionsContext` exposes two pending flags — `isAnyPending` (global ops + card-level actions, used by footer and "New Review" link) and `isGlobalOperationPending` (bulk publish/re-run/restore-all, used by `FindingsList` to disable cards). Individual card actions disable only the acting card + footer, not other cards. `FindingsList` syncs card pending state to context via `useEffect`
- **Animated collapsible**: use Radix `Collapsible` + `tw-animate-css` classes (`data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden` on Content). Put visual styling (`bg-muted/50`, `border`, `p-4`) on an inner `<div>`, not on Content itself — mixing `overflow-hidden` with border/padding causes visual glitches during height animation
- **Partial-reveal collapsible**: for "show N lines, expand to full" (not 0↔full), use `max-height` + `transition-[max-height]` with measured `scrollHeight` via `useEffect` + state — NOT Radix `Collapsible` (which only does 0↔full). A fixed large `max-height` creates bad collapse UX (invisible transition range). Gradient overlay uses `from-muted` to blend with prose `pre` background (`--tw-prose-pre-bg: var(--muted)`)
- **DOM measurement**: never read `ref.current` during render (`react-hooks/refs` ESLint rule). Measure in `useEffect`, store in state. For animated height transitions, measure `scrollHeight` in `useEffect` and fall back to a line-count estimate (`lineCount * 20 + 32`) before the effect runs
- **Cross-component state sync**: never call a context setter inside a `useState` updater — React forbids updating one component while rendering another. Use `useEffect` to sync derived state to parent context (e.g., `useEffect(() => { setContextValue(localState.size > 0) }, [localState])`)
- **Destructive confirmations**: use shadcn `AlertDialog` (not `window.confirm()`). Use uncontrolled pattern — `AlertDialogAction` auto-closes via Radix internals, no `useState` needed. Pass `variant="destructive"` to `AlertDialogAction`
- **Server Component error handling**: pages calling external APIs (Azure DevOps) should wrap calls in `try/catch`, log with `logger.error()`, and return an inline error UI with a "Back" link — don't let errors propagate to the error boundary
- **Tailwind Typography**: register via `@plugin "@tailwindcss/typography"` in `globals.css`. Override `--tw-prose-*` vars on `.prose` selector (not `:root`) — the plugin sets defaults directly on `.prose`, and a direct declaration beats an inherited one regardless of layers. Keep `.prose` overrides unlayered to win over the plugin's layered output
- **Markdown rendering**: `components/markdown.tsx` uses `prose max-w-none break-words` (base = 16px) + `rehype-highlight` (sync). Prose token colors mapped to design system in `globals.css`. Use `rehype-highlight` (not Shiki) — Shiki is async and incompatible with `"use client"` components. Callers may pass `text-sm` for tighter contexts (e.g., finding cards) but should not pass `text-muted-foreground` — prose handles body color via `--tw-prose-body`
- **Markdown editor**: `markdown-rule-editor.tsx` uses `HighlightedTextarea` (transparent textarea over highlighted `<pre><code>` backdrop) for live syntax highlighting. Formatting utilities live in `lib/utils/markdown-formatting.ts`. Textarea selection/cursor positioning uses `flushSync` (from `react-dom`) + `setSelectionRange` — not `useLayoutEffect` + ref, which breaks when `form.setValue` with `shouldValidate` triggers multiple renders. List indentation uses 4 spaces (not 2) — CommonMark requires indent >= parent marker width (3 for ordered `1. `, 2 for bullet `- `); 4 spaces is universally safe
- **highlight.js theme**: a single unified GitHub Light / Dark Dimmed hljs theme in `globals.css` serves both prose code blocks and the markdown editor overlay. Must be unlayered CSS to override prose's layered `pre code` color rules. Tokens shared with the markdown grammar (`.hljs-code`, `.hljs-bullet`, `.hljs-quote`, `.hljs-link`) are split from their original groups so they can have markdown-friendly styles without affecting other tokens in the same group
- **highlight.js imports**: use tree-shaken `highlight.js/lib/core` + register only needed languages (not the full bundle). Added as a direct dependency because pnpm strict isolation blocks transitive imports via `rehype-highlight`
- **Scrollbar styling in code blocks**: use `[scrollbar-width:thin]` + `[scrollbar-color:var(--muted-foreground)_transparent]` for theme-aware thin scrollbars. The transparent track blends with any background in both light and dark modes
- **Dark mode**: uses `@media (prefers-color-scheme: dark)` only — no `.dark` class toggle. This means `prose-invert` cannot be used (it requires `.dark` class). Instead, prose vars reference design system tokens that automatically swap in the dark media query
- **Package manager**: pnpm only — do not use npm or yarn

## Known Issues

- **Radix `useId()` hydration mismatch**: React 19.2 + Next.js 16 + Radix UI produces mismatched IDs between server and client (tracked in [radix-ui/primitives#3700](https://github.com/radix-ui/primitives/issues/3700)). This is an upstream bug — functional behavior is unaffected, only `aria-controls` references are stale. Do not attempt to fix in our code; wait for upstream resolution.
- **Deleting route files**: after removing `app/api/` route files, delete `.next/` to clear stale type references in `.next/types/validator.ts` — otherwise `tsc --noEmit` (and the pre-commit hook) will fail

## Environment Variables

Required: `AZURE_DEVOPS_PAT`

Optional: `REPOS_DIR`, `CODERABBIT_BIN`, `CODERABBIT_TIMEOUT_MS`, `CLAUDE_CODE_BIN`, `CLAUDE_CODE_TIMEOUT_MS`, `REVIEW_ENGINE` (`coderabbit` | `claude-code` | `stub`), `DATABASE_URL` (default: `file:<cwd>/.data/pr-reviewer.sqlite`), `LOG_LEVEL`

Env schema defined in `lib/config/env.ts` with Zod validation.

## Claude Code Tooling

- `.claude/rules/` — project conventions enforced contextually (architecture, enums, naming, git workflow, etc.)
- `.claude/skills/` — project skills: `clear-coderabbit-cli-cache`, `create-migration` (Prisma migration workflow with validation), `verify-review-pipeline` (stub engine smoke test)
- `.mcp.json` — MCP server config (shadcn component registry, ESLint)
