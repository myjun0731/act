---
name: orch-refine-code
description: Orchestrate a behavior-preserving refactor — confirm tests are green, restructure without changing behavior, keep tests green, review, and gated commit. Use when the structure should improve but behavior must not change.
metadata:
  origin: ECC
---

# orch-refine-code

Actor · action · target: **orch · refine · code**. Thin wrapper over the shared
engine in [`orch-pipeline`](../orch-pipeline/SKILL.md).

## When to Use

- Same behavior, **better structure**: extract modules, remove duplication, kill
  dead code, reduce nesting, rename for clarity.
- Distinguish from siblings: if behavior is meant to change at all, this is the
  wrong skill (`orch-change-feature` / `orch-fix-defect`).

## Operation settings

- **Default size floor:** standard — restructures touch multiple files.
- **Phase mask:** 0 → 2 (plan the restructure) → 4 (keep green) → 5 → 6. No new
  behavior tests are written — the existing suite is the safety net.
- **First move (phase 4):** confirm the relevant tests exist and are **green
  before** touching code; if coverage is thin, add characterization tests first.
  Then restructure in small steps, re-running tests after each.
- **sdlc stages:** `sdlc:analyze` (light) → `sdlc:design` (restructure plan) →
  `sdlc:test` (`mode:"verify"`, confirm green) → `sdlc:implement` →
  `sdlc:test` (`mode:"verify"`) → `sdlc:review` → `sdlc:report`. Use `verify` so
  the test stage only runs and fixes — it writes no new behavior tests.

## How It Works

1. Run the `orch-pipeline` engine with the settings above.
2. For dead-code / duplication sweeps, run a dead-code cleanup pass (for JS/TS:
   knip / depcheck / ts-prune) and remove only what the tools and tests confirm
   is unused.
3. Stop at **Gate 1** (restructure plan) and **Gate 2** (pre-commit).
4. Commit as `refactor:` — the diff must be behavior-neutral.

## Example

```
orch-refine-code: extract the NWS HTTP client out of poller.py
→ confirm tests green → plan extraction  [GATE 1: approve]
→ move in small steps, tests green throughout → sdlc:review → sdlc:report
→ commit refactor:  [GATE 2: confirm]
```
