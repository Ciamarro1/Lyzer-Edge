---
name: skill-forge
description: Core methodology for creating, defining, and formalizing new skills into the Lyzer Labs ecosystem.
---

# Skill Forge Protocol

This skill provides the systematic framework for defining new capabilities (skills) for agents within the project.

## Core Axiom

A skill is not just a script; it is a **transferable behavioral module** that allows any agent to consistently apply a specific methodology.

## Structural Requirements of a Skill

Every new skill MUST be created inside a dedicated folder: `.agents/skills/<skill-slug>/`
The folder MUST contain a `SKILL.md` file.

### Required Sections in `SKILL.md`:
1. **Frontmatter:** `name` and `description` (brief summary of what it solves).
2. **Core Axioms / Principles:** The non-negotiable rules the agent must follow.
3. **Execution Protocol:** The step-by-step logic or methodology.
4. **Failure Modes:** Potential traps the agent must avoid when applying the skill.

## Creation Workflow

1. **Analyze the Missing Capability:** What can the system NOT do consistently right now?
2. **Define the Boundaries:** Ensure the skill does not overlap with existing skills (e.g., don't create `api-design` if `api-patterns` exists).
3. **Draft the Axioms:** distill the essence of the skill into 2-3 immutable laws.
4. **Formalize the `SKILL.md`:** Write the markdown adhering strictly to the structural requirements.

## Example Usage

When an agent needs to create a new skill for "Log Analysis", they use `skill-forge` to ensure the resulting `.agents/skills/log-analysis/SKILL.md` is strictly formatted, teaches principles rather than raw commands, and identifies common analysis traps (like Confirmation Bias).
