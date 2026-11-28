---
name: orch-pipeline
description: Shared orchestration engine behind the orch-* skill family — the gated Research-Plan-TDD-Review-Commit pipeline mapped onto act's sdlc stages (analyze, design, implement, test, review, report), size classifier, agent and workflow map, and two human gates (plan approval, commit confirmation) that orch-* operation skills delegate to. Use indirectly via orch-add-feature, orch-fix-defect, orch-change-feature, orch-refine-code, or orch-build-mvp; read directly only when adding an orch operation or tuning shared phases.
metadata:
  origin: ECC
---

# Orchestrator Pipeline (shared engine)

The `orch-*` skills are thin wrappers. They do not re-implement any work — they
classify the request, choose which phases of *this* pipeline run, and delegate
each phase to an existing act sdlc workflow, dev-toolkit agent, or skill. This file
is that pipeline.

> Invoke an operation skill (`orch-add-feature`, `orch-fix-defect`, …) rather
> than this engine directly. This file is the reference they point at.

## When to Use

- Loaded indirectly whenever an `orch-*` operation skill runs.
- Read directly only when adding a new operation to the family or tuning the
  shared phases, gates, or agent map.

## The operation family

| Skill | Operation | Trigger | First move |
|-------|-----------|---------|------------|
| `orch-add-feature` | feature | capability does not exist yet | research + plan a new slice |
| `orch-change-feature` | tweak | works, but desired behavior differs | amend existing behavior *and its tests* |
| `orch-fix-defect` | fix | broken; behavior is wrong | reproduce as a failing test, then fix |
| `orch-refine-code` | refactor | behavior stays, structure improves | restructure while keeping tests green |
| `orch-build-mvp` | mvp | bootstrap from a design/spec doc | ingest doc → vertical slices |

> These wrappers **compose** act's sdlc pipeline rather than replace it: the
> `sdlc:analyze`, `sdlc:design`, `sdlc:implement`, `sdlc:test`, `sdlc:review`, and
> `sdlc:report` workflows (the stages behind `/sdlc:pipeline`), the dev-toolkit
> agents they dispatch, and the `test-driven-development` skill. The orch-* family
> adds the per-scenario first-move rules, the shared size classifier, and the two
> gates on top of them, so one umbrella covers all five operations consistently.

## Step 0 — Classify size (right-sizing)

Ceremony scales to blast radius. Score the request on three signals, take the
**highest** tier any signal reaches, and state the result in one line so the user
can override:

| Tier | Files touched | New dependency / contract | Design ambiguity | Phases that run |
|------|---------------|---------------------------|------------------|-----------------|
| trivial | 1, a few lines | none | none — the change is obvious | 4 → 5 → 6 |
| small | 1 file / 1 function | none | clear once you read the code | (1 light) → 4 → 5 → 6 |
| standard | 2–5 files | maybe a new internal module | one real choice to make | 1 → 2 → 4 → 5 → 6 |
| large | many / cross-cutting | new external dep, public API, or a spec doc | multiple open questions | 1 → 2 → (3) → 4 → 5 → 6 |

Phase 0 (Intake) always runs and is omitted from the mask column above. The
tie-breaker: anything touching a security trigger (below) or a public API /
contract is **at least** standard, regardless of file count.

## The phases

Each phase delegates — it does not do the work inline. Phases map onto act's sdlc
stages; artifacts land in the target repo's `.sdlc/<slug>/` exactly as with
`/sdlc:pipeline` (see that skill for workflow args and the gate rules of the
automatic segment).

| orch phase | act sdlc stage | Workflow / tool |
|------------|----------------|-----------------|
| 1 Research & Reuse | analyze | `sdlc:analyze` → `01-analysis.md` |
| 2 Plan | design | `sdlc:design` → `02-design.md` + `02-tasks.json` |
| 3 Scaffold (MVP only) | implement (slice 1) | `sdlc:implement` with `only:` the slice-1 task IDs |
| 4 Implement (TDD) | implement + test | `sdlc:implement` → `sdlc:test` |
| 5 Review | review | `sdlc:review` |
| 6 Commit | report | `sdlc:report` → `REPORT.md`, then Gate 2 |

- **0. Intake** — restate the request, pick `slug`, record `baseRef`. For
  `orch-build-mvp`, read the spec/design doc and extract scope, locked decisions,
  and a feature list.
- **1. Research & Reuse** — run `sdlc:analyze` with the request (plus, for build
  MVP, the extracted spec). Apply the `search-first` skill first so existing
  libraries, packages, and repos are checked before net-new code; prefer adopting
  a proven implementation.
- **2. Plan** — run `sdlc:design` (its approach step uses the dev-toolkit
  `architect` agent when installed). The resulting `02-tasks.json` is the
  `task_list`, ordered as thin vertical slices. `sdlc:design` reads
  `01-analysis.md`, so when an operation skips or lightens Research, still run
  `sdlc:analyze` at quality `standard` before it. → **GATE 1.**
- **3. Scaffold** — `orch-build-mvp` only: stand up the first end-to-end slice by
  running `sdlc:implement` on that slice's tasks only.
- **4. Implement (TDD)** — `sdlc:implement`, then `sdlc:test` (`mode:"full"`), with
  the `test-driven-development` skill as the method: red → green → refactor.
  Honor the operation's first-move rule — put it in the design's task list so the
  test-first step is an explicit task.
- **5. Review** — `sdlc:review`. It always runs the dev-toolkit `security-reviewer`
  lane and adds type-specific reviewers for the changed files. Re-cycle
  test(`mode:"verify"`) ↔ review per the `/sdlc:pipeline` gate table.
- **6. Commit** — `sdlc:report` writes `REPORT.md`. act never commits
  automatically: propose conventional commits (`feat:` / `fix:` / `refactor:` / …),
  one per logical chunk. → **GATE 2.**

**trivial / small tiers** skip the analyze/design workflows (there is no
`02-tasks.json` to drive `sdlc:implement`): implement inline with the
`test-driven-development` skill, run the tests, then dispatch the matching
dev-toolkit reviewer agent (plus `security-reviewer` on a security trigger)
instead of `sdlc:review`, and summarize in place of `REPORT.md`. The gates still
apply.

## The two gates

This family is **gated, not autonomous**:

1. **GATE 1 — after Plan.** Present the `task_list` (`02-tasks.json` summary);
   do not write implementation code until the user approves. This is the sdlc
   design approval; `sdlc:analyze` keeps its own user approval before design runs.
2. **GATE 2 — before Commit.** Present `REPORT.md` highlights, the diff summary,
   and proposed messages; do not commit until the user confirms.

Everything between the gates flows without stopping — the same automatic segment
(implement → test → review → report) as `/sdlc:pipeline`. Return to the user early
only when a failure points to a design defect.

## Agent / command map

| Phase | Primary | Fallback / escalation |
|-------|---------|----------------------|
| Intake / understand | read-only exploration pass; `codebase-onboarding` skill | `dev-toolkit:codebase-map` workflow for a large module; trace existing paths before a tweak, fix, or refactor |
| Research | `sdlc:analyze` + `search-first` skill | — |
| Plan | `sdlc:design` (uses `architect`) | `architect` agent directly for a light plan |
| Implement | `sdlc:implement` + `sdlc:test`, `test-driven-development` skill | `build-error-resolver` (Node/TS) or `java-build-resolver` on build breaks |
| Review | `sdlc:review` (routes changed files to the matching language reviewer automatically) | language reviewer agent: dev-toolkit (`java-reviewer`, `typescript-reviewer`, `react-reviewer`, `vue-reviewer`, `database-reviewer`); lang-toolkit, if installed (`python-reviewer`, `django-reviewer`, `fastapi-reviewer`, `go-reviewer`, `rust-reviewer`, `kotlin-reviewer`, `cpp-reviewer`, `csharp-reviewer`, `fsharp-reviewer`, `php-reviewer`, `ruby-reviewer`, `gdscript-reviewer`); mobile, if installed (`swift-reviewer`, `flutter-reviewer`); a language-focused review pass where none exists |
| Security | `security-reviewer` (always on in `sdlc:review`) | — |
| Commit gate | `sdlc:report` | `conventional-commit-review` skill for the proposed messages |
| MVP inner loop | generator–evaluator loop of the `gan-style-harness` skill (agentic, if installed; otherwise the same loop inline) | tune max iterations / pass threshold |

Match the language reviewer to the repo (see the repo's own `CLAUDE.md`).

## Security-review trigger

Pull in `security-reviewer` when the diff touches any of: authentication or
authorization, user-input handling, database queries, file-system paths,
external API calls, cryptography, or secrets / credentials. `sdlc:review` already
runs it on every change; on the inline trivial/small path dispatch it explicitly.

## Handoff artifacts

The pipeline carries no hidden state — the planning docs *are* the handoff:

- `.sdlc/<slug>/01-analysis.md`, `02-design.md`, and `02-tasks.json` (from Plan)
  drive the Implement loop; `state.json` lets an interrupted run resume.
- `03-implementation.md`, `04-test.md`, `05-review.md`, and `REPORT.md` record the
  rest. Larger work may also emit PRD / architecture docs under the repo's `docs/`.
- Review findings (CRITICAL / HIGH) must be resolved before Gate 2
  (`unresolvedHigh == 0` in `sdlc:review`).

## Verification

- size tier was stated and matched the work
- Gate 1 (plan) and Gate 2 (commit) were both honored
- `security-reviewer` ran iff a security trigger was touched
- commits are conventional and scoped to one logical change
- new / changed behavior has tests; coverage ≥ 80% (or the repo's own threshold)
- nothing was committed before the user confirmed at Gate 2
