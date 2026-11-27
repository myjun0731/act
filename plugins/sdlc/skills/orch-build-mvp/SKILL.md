---
name: orch-build-mvp
description: Orchestrate bootstrapping a working MVP from a design or spec document — ingest the SDD/PRD, plan thin vertical slices, scaffold the first end-to-end slice, then drive a generator-evaluator build loop with review and gated feat commits. Use when a design or spec document must become a running MVP through planned vertical slices.
metadata:
  origin: ECC
---

# orch-build-mvp

Actor · action · target: **orch · build · mvp**. Thin wrapper over the shared
engine in [`orch-pipeline`](../orch-pipeline/SKILL.md).

## When to Use

- The user has a **design / spec document** (SDD, PRD, system_design) and wants a
  working vertical slice bootstrapped from it.
- Takes a doc path as its argument, e.g. `civicpulse/docs/SDD-v0.6.md`.

## Operation settings

- **Default size floor:** large — this is the full pipeline including Scaffold.
- **Phase mask:** 0 (read the spec) → 1 → 2 (heavy) → 3 (scaffold) → 4 → 5 → 6.
- **First move (phase 0 → 2):** read the doc; extract scope, locked decisions,
  and the feature list; order it into **thin vertical slices** (one end-to-end
  path first, not all-models-then-all-views). Phase 3 stands up that first slice.
- **sdlc stages:** `sdlc:analyze` (with the spec) → `sdlc:design` (slice plan) →
  `sdlc:implement` on slice 1 only (scaffold) → per slice: build loop →
  `sdlc:test` → `sdlc:review` → `sdlc:report`.

## How It Works

1. Run the `orch-pipeline` engine with the settings above.
2. **Reuse the generator–evaluator loop** of the `gan-style-harness` skill
   (agentic plugin, if installed — otherwise run the same loop inline: one pass
   generates a slice, a separate pass scores it against the spec rubric, repeat)
   instead of hand-rolling an ad-hoc iterate loop:
   - Translate the SDD into the harness spec and evaluation rubric — you already
     have the spec, so skip the harness's planner step.
   - Run the generator → evaluator iterations per slice (defaults: max 15
     iterations, pass threshold 7.0; evaluate the live app for UI slices,
     code-only for non-UI slices), writing numbered feedback files until the
     score passes or plateaus.
   - Then run `sdlc:test` and `sdlc:review` on the slice.
3. Stop at **Gate 1** (slice plan) and **Gate 2** (pre-commit). act never
   commits automatically; propose the scaffold and each slice as separate
   `feat:` commits.
4. Add `security-reviewer` for any slice touching a security trigger.

## Example

```
orch-build-mvp: civicpulse/docs/SDD-v0.6.md
→ read SDD → slice list (vertical) → scaffold slice 1  [GATE 1: approve]
→ gan-style-harness generator → evaluator loop scores vs spec → sdlc:test → sdlc:review
→ commit feat:  [GATE 2: confirm] → next slice
```
