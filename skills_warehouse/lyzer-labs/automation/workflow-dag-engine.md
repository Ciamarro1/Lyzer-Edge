# Workflow DAG Engine

> **Domain:** Automation · Orchestration
> **Agent:** All
> **Version:** 1.0.0

## Architecture
- DAG-based workflow execution
- ThreadPoolExecutor for parallel steps
- SQLite WAL persistence for checkpointing
- Automatic dependency resolution

## Key Concepts
- Steps: individual agent executions
- Dependencies: steps that must complete first
- Parallel execution: steps with no dependencies run concurrently
- Checkpoints: workflow state snapshots for recovery

## 30 Workflows Available
- `organic_affiliate_cycle.json` — SEO + affiliate marketing
- `parallel_revenue_tree.json` — 13 revenue sources
- `full_media_workflow.json` — Content → Media → Design → Deploy
- `production_workflow.json` — Full 48-step pipeline
- `money_workflow.json` — Revenue generation
