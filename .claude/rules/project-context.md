# Project Context

Azure DevOps AI PR Reviewer — a web app that automates PR reviews.

## Core flow

Connect to Azure DevOps → fetch PR changes → run AI review (CodeRabbit preferred, LLM fallback) → produce structured findings → publish as PR comment threads.

## Constraints

- Primary platform: Azure DevOps (repos + PRs + comments)
- AI engine is pluggable (`ReviewEngine` interface in `server/ai/engine.ts`)
- Output must be actionable: specific files/locations, proposed fixes, no generic advice
- Keep scope incremental: MVP path (review → preview → publish), then iterate
