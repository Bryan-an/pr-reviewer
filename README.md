# PR Reviewer (Azure DevOps + AI)

## Overview

This project aims to **automate pull request reviews in Azure DevOps** using AI, generating high-signal review comments while enforcing **team-specific coding standards**.

It is designed for scenarios where a single reviewer (or a small group) receives many PRs and must review them manually, repeatedly checking for the same classes of issues: correctness, maintainability, security, consistency, and adherence to internal conventions.

## The idea

Build a **web app** that connects to Azure DevOps, fetches the set of changes in a pull request, runs an AI review, and then produces **ready-to-post comments** (general and file-scoped, and later line-scoped) that you can publish back to the PR.

The reviewer should be able to provide their own standards (architecture rules, naming, error handling, testing expectations, etc.) so the AI review is aligned with the team’s expectations rather than generic advice.

## AI approach (high level)

The review engine is intended to be **pluggable**:

- Prefer using **CodeRabbit** (when available) to leverage its review capabilities and standards enforcement.
- Fall back to a direct LLM provider when CodeRabbit is not available or not suitable.

## What “done” looks like for the MVP

- Select a PR from Azure DevOps
- Generate an AI review aligned with your standards
- Preview the findings
- Publish the comments back to Azure DevOps as PR threads

## Status

Early stage: repository scaffolding and documentation in progress.
