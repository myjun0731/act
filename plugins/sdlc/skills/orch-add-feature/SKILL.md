---
name: orch-add-feature
description: Orchestrate building a brand-new feature end to end — research, plan, TDD implementation, review, and gated commit — by delegating each phase to the matching act sdlc stage (analyze, design, implement, test, review, report). Use when adding a capability that does not exist yet.
metadata:
  origin: ECC
---

# orch-add-feature

Actor · action · target: **orch · add · feature**. Thin wrapper over the shared
engine in [`orch-pipeline`](../orch-pipeline/SKILL.md).

## When to Use

- The user wants a capability that does **not exist yet** ("add", "build",
  "implement", "support …").
- It is net-new behavior — not a correction (`orch-fix-defect`) and not an
  alteration of existing behavior (`orch-change-feature`).

## Operation settings

- **Default size floor:** standard — run Research + Plan unless clearly small.
- **Phase mask:** 0 → 1 → 2 → 4 → 5 → 6 (skip 3 Scaffold; that is MVP-only).
- **sdlc stages:** `sdlc:analyze` → `sdlc:design` → `sdlc:implement` →
  `sdlc:test` → `sdlc:review` → `sdlc:report` (standard+; small / trivial use the
  inline path in `orch-pipeline`).
- **First move (phase 4):** write *new* failing tests for the new behavior, then
  implement to green.

## How It Works

1. Run the `orch-pipeline` engine with the settings above.
2. Classify size first; small / trivial features collapse toward 4 → 5 → 6.
3. Stop at **Gate 1** (plan approval) and **Gate 2** (pre-commit).
4. Add `security-reviewer` if the feature touches a security trigger.

> Related: `/sdlc:pipeline` runs the same stages unconditionally. `orch-add-feature`
> differs by sharing the `orch-pipeline` engine — the size classifier, the
> first-move rule, and the two gates — with the rest of the family, so it
> right-sizes trivial features to 4 → 5 → 6.

## Example

```
orch-add-feature: add OAuth2 login to nws-poller
→ sdlc:analyze (search-first: existing auth libs) → sdlc:design task_list  [GATE 1: approve]
→ sdlc:implement + sdlc:test (new failing tests first) → sdlc:review (security-reviewer: auth path)
→ sdlc:report → commit  [GATE 2: confirm]
```
