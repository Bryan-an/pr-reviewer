---
name: create-migration
description: Create and apply a new Prisma migration with validation. Use when the user asks to add/modify database columns, create new models, change the Prisma schema, or run migrations. Also use when encountering P2022 column-not-found errors.
disable-model-invocation: true
argument-hint: "[migration-name]"
allowed-tools: Read, Edit, Bash, Grep
---

# Create Prisma Migration

Create and apply a Prisma migration following the project's conventions. The migration name is `$ARGUMENTS` (kebab-case slug).

## Prerequisites

If `$ARGUMENTS` is empty (no migration name provided), stop immediately and ask the user:

> "Please provide a migration name, e.g. `/create-migration add-status-column`"

Do not proceed to any of the steps below without a migration name.

## Steps

1. **Edit the schema** — modify `prisma/schema.prisma` as needed for the requested change (new model, new column, relation, index, etc.). Follow existing conventions in the schema (SQLite provider, `cuid()` IDs, `@default(now())` for timestamps, `@@index` for query patterns).

2. **Ensure the data directory exists** — SQLite won't create parent directories:

```bash
mkdir -p .data
```

3. **Apply the migration**:

```bash
pnpm prisma migrate dev --name $ARGUMENTS
```

This creates the migration SQL in `prisma/migrations/`, applies it to the local database, and regenerates the Prisma client.

4. **Verify the client was regenerated** — the generated client lives at `prisma/generated/prisma/`. Confirm it exists:

```bash
ls prisma/generated/prisma/index.js
```

5. **Run type-check** to verify nothing is broken:

```bash
pnpm type-check
```

6. Report the results to the user: which models/columns changed, the migration name, and whether type-check passed.

## Important

- The generated Prisma client output path is `prisma/generated/prisma/` (configured in `schema.prisma`).
- `prisma generate` (via `postinstall`) updates the client but does NOT apply migrations to the database. Always use `prisma migrate dev` to both apply and generate.
- If type-check fails, investigate and fix the issue before finishing.
