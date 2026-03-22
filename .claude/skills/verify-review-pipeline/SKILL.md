---
name: verify-review-pipeline
description: Run the review pipeline end-to-end with the stub engine to verify integration across all layers (ADO fetch, git clone, AI engine, DB persistence). Use when making changes to the review pipeline, after schema migrations, or when you want to smoke-test the full flow.
disable-model-invocation: true
argument-hint: "[pr-url]"
allowed-tools: Read, Bash, Grep, Glob
---

# Verify Review Pipeline

Run the full review pipeline using the stub engine to verify all integration layers work correctly.

## Prerequisites

- The dev server must be running on port 3100. If not, start it in the background first.
- `AZURE_DEVOPS_PAT` must be set in `.env`.
- The `.data/` directory must exist (`mkdir -p .data`).

## Steps

1. **Ensure the data directory and database exist**:

```bash
mkdir -p .data
```

2. **Check if the dev server is running**:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100 || echo "NOT_RUNNING"
```

If not running, tell the user to start it with `pnpm dev` in another terminal before continuing.

3. **Run a review with the stub engine**. The PR URL comes from `$ARGUMENTS`. If no URL is provided, ask the user for one — a real Azure DevOps PR URL is required because the pipeline fetches PR metadata and clones the repo:

```bash
response=$(curl -s -X POST http://localhost:3100/api/review/run \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg url "$ARGUMENTS" '{prUrl: $url}')" \
  -w "\nHTTP_STATUS:%{http_code}")
echo "$response"
```

The request body is `{ "prUrl": "<url>" }`. The `REVIEW_ENGINE` env var in `.env` controls which engine runs — set it to `stub` before running to use the stub engine, or leave it as-is to test the real engines.

4. **Verify the response and extract runId** — a successful run returns `{ "runId": "<cuid>" }` with HTTP 200. Parse out the `runId`:

```bash
run_id=$(echo "$response" | head -1 | jq -r '.runId')
echo "runId: $run_id"
```

Check:

- HTTP status is 200 (last line of `$response` contains `HTTP_STATUS:200`)
- `$run_id` is non-empty and not `null`

5. **Verify database persistence** — query SQLite to confirm the ReviewRun and its Findings were persisted:

```bash
sqlite3 .data/pr-reviewer.sqlite "SELECT id, prUrl, engineName, createdAt FROM ReviewRun WHERE id = '$run_id';"
sqlite3 .data/pr-reviewer.sqlite "SELECT COUNT(*) as finding_count FROM Finding WHERE reviewRunId = '$run_id';"
```

6. **Report results** to the user:
   - Whether the API returned a valid `runId`
   - The engine name used
   - How many findings were persisted
   - Any errors encountered

## Troubleshooting

- **P2022 column-not-found**: Run `pnpm prisma migrate dev` to apply pending migrations.
- **Connection refused on port 3100**: The dev server isn't running — start with `pnpm dev`.
- **401/403 from Azure DevOps**: Check that `AZURE_DEVOPS_PAT` in `.env` is valid and has read access to the repo.
- **Empty diff error**: The PR may have no file changes — try a different PR URL.
