---
name: pipeline
description: >-
  분석 → 설계 → 구현 → 테스트 → 리뷰 → 완료 보고서를 sdlc 동적 워크플로 단위로 연계해 실행하는 SDLC 파이프라인 진행 규약.
  분석·설계는 사용자가 정한 품질 수준(목표 점수·기준별 하한·필수 항목)에 도달할 때까지 심사 패널 채점과 보강을 반복하고 사용자 승인을 받는다.
  설계 승인 뒤 구현·테스트·리뷰·보고서는 Claude 가 묻지 않고 게이트 규칙에 따라 스스로 호출한다.
  "분석부터 보고서까지", "SDLC 파이프라인", "/sdlc:pipeline", 기능 개발을 단계별 워크플로로 끝까지 진행할 때 사용.
argument-hint: "<무엇을 만들/바꿀지> [품질: standard|high|strict|숫자]"
---

# SDLC 파이프라인

이 스킬을 호출한 것 자체가 **동적 워크플로 실행에 대한 opt-in** 이다. 아래 순서로 `Workflow` 도구를
`name: "sdlc:<단계>"` 로 호출한다. 산출물은 대상 레포의 `.sdlc/<slug>/` 에 쌓인다.

```
[사용자 관문]                      [Claude 자동 연계]
 analyze ⟲ ─승인─▶ design ⟲ ─승인─▶ implement ─▶ test ⟲ ─▶ review ─┬─▶ report
   ▲ 품질 미달·피드백 시 재실행        ▲                     ▲          │ 미해결 시
   └── 사용자가 결정                    └─ (설계 결함일 때만 사용자에게 복귀) └─ test(verify)·review 재사이클
```

| 단계 | 워크플로 | 호출 주체 | 산출물 |
|---|---|---|---|
| 1 분석 | `sdlc:analyze` | **사용자 관문** — 품질 루프 + 승인 | `01-analysis.md` (+ 라운드별 `01-analysis.rN.md`) |
| 2 설계 | `sdlc:design` | **사용자 관문** — 품질 루프 + 승인 | `02-design.md`, `02-tasks.json` |
| 3 구현 | `sdlc:implement` | Claude 자동 | 코드 변경, `03-implementation.md` |
| 4 테스트 | `sdlc:test` | Claude 자동 | 테스트 파일, `04-test.md` |
| 5 리뷰 | `sdlc:review` | Claude 자동 | 수정, `05-review.md` |
| 6 완료 | `sdlc:report` | Claude 자동 | `REPORT.md` |

`sdlc:deliver` 는 3~6 을 한 워크플로로 묶은 오케스트레이터다(아래 "한 번에 실행").

## 0. 준비

1. **요청**: 인자에서 무엇을 만들/바꿀지 확인한다. 없으면 한 문장으로 묻는다.
2. **품질 수준**(분석·설계 공통, 단계별로 다르게 지정 가능): 인자에 없으면 `AskUserQuestion` 으로 한 번에 묻는다.

   | 수준 | 목표(가중 평균) | 기준별 하한 |
   |---|---|---|
   | `standard` | 75 | 60 |
   | `high` (기본) | 85 | 70 |
   | `strict` | 92 | 80 |
   | 직접 지정 | `target` | `floor` |

   함께 받을 수 있는 것: `mustHave`(반드시 들어가야 할 항목 목록 — 심사위원 과반이 충족으로 판정해야 통과),
   `criteria`(기본 채점 기준 대체 `[{key, desc, weight}]`), `judges`(심사위원 수 1~5, 기본 3),
   `maxRounds`(기본 5), `patience`(점수 개선 없이 허용할 연속 라운드, 기본 2).
3. **작업 디렉터리**: `slug` = 요청을 요약한 kebab-case. `dir = .sdlc/<slug>`.
4. **기준점**: `git status --porcelain` 이 비어 있지 않으면 사용자에게 알린다(리뷰 범위에 섞임). `baseRef = git rev-parse HEAD` 를 기록한다.
5. `.sdlc/<slug>/state.json` 을 쓴다: `{ request, dir, baseRef, quality:{analysis, design}, stage:"analysis", history:[] }`.
   이미 있으면 **이어서 진행**: `stage` 다음 단계부터 재개한다.

## 1. 분석 (사용자 관문)

```
Workflow({ name: "sdlc:analyze", args: { request, dir, quality: <분석 품질> } })
```

워크플로 안에서 `작성 → 심사 패널 채점 → 약한 기준부터 보강` 을 **목표 점수 이상 + 모든 기준 하한 이상 + 필수 항목 충족**이
될 때까지 반복한다. 멈추는 조건: `passed`(도달) · `stagnated`(patience 라운드 연속 개선 없음) · `maxRounds` · `error`.

결과를 사용자에게 보여 준다: 점수/목표, 기준별 점수, 라운드 이력(`history`), 남은 지적(`gaps` 요약), 문서 경로.
그리고 `AskUserQuestion` 으로 결정을 받는다.

- **통과(`passed`)**: 승인 / 피드백 반영 재작성 / 기준 상향 후 재실행
- **미달(`stagnated`·`maxRounds`)**: 라운드 더 돌리기 / 미해결 질문에 답해 피드백으로 재실행 / 기준 조정 / 현재 수준으로 승인

재실행 시 `args.previous = "<dir>/01-analysis.md"` 와 사용자의 답·지시를 `args.feedback` 으로 넘긴다
(피드백이 있으면 그 문서에서 출발해 반영본부터 작성, 없으면 기존 문서를 먼저 채점). **사용자가 승인할 때까지 반복한다.**
승인되면 `state.json` 에 점수·라운드를 `history` 로 남기고 `stage:"design"`.

## 2. 설계 (사용자 관문)

```
Workflow({ name: "sdlc:design", args: { dir, quality: <설계 품질> } })
```

분석과 같은 품질 루프(기준: 추적성·구조 타당성·구현 가능성·테스트 가능성·위험)를 돌고, 확정 시
`02-tasks.json`(작업 ID·대상 파일·선행 작업·대응 AC·빌드/테스트 명령)을 추출한다. 결과 제시·결정·재실행 방식은 1단계와 같다.
`taskCount` 가 0 이면 승인 전에 사용자에게 알린다. 승인되면 `stage:"implement"`.

## 3~6. 자동 구간 (사용자에게 묻지 않는다)

설계 승인 뒤에는 **각 단계 사이에 확인을 구하지 말고** 바로 다음 워크플로를 호출한다. 각 결과를 읽고 아래 게이트 규칙으로
다음 호출을 정한다. 단계마다 `state.json` 의 `stage`·`history` 를 갱신하고, 진행 상황은 한 줄씩만 알린다.

| 직전 결과 | 다음 호출 |
|---|---|
| implement: `failed` 비어 있고 `buildOk` | test `{ dir, mode:"full", testCmd }` |
| implement: `failed` 있음 (1회차) | implement `{ dir, only: failed }` 재시도 |
| implement: 재시도 후에도 `!buildOk` | report `{ outcome:{status:"blocked", blocker} }` 로 종료 |
| test: `passed` | review `{ dir, baseRef, testCmd }` |
| test: 실패, `stopReason:"env"` | report (blocked) — 환경 문제를 보고서에 명시 |
| test: 실패 (사이클 < 2) | review 를 먼저 돌린 뒤 test `{ mode:"verify" }` 로 재사이클 |
| review: `unresolvedHigh == 0` 이고 테스트 통과 | report |
| review: `unresolvedHigh > 0` 또는 `testsPass == false` (사이클 < 2) | test `{ mode:"verify" }` → review 재사이클 |
| 사이클 2회 후에도 미해결 | report `{ outcome:{status:"partial", blocker} }` |

**사용자에게 돌아가는 유일한 예외**: 실패 원인이 구현이 아니라 **설계 자체의 결함**(요구 충돌, 불가능한 인터페이스 등)으로
판단될 때. 이때는 멈추고 근거와 함께 "설계 단계로 되돌아갈지"를 묻는다(설계는 사용자 관문이므로). 그 밖의 오류·실패는 위 규칙대로 처리한다.

report 호출 시 `args = { dir, baseRef, outcome, history: state.history }` 를 넘긴다. 끝나면 `REPORT.md` 의 결과 요약,
요구 추적 매트릭스의 미충족 항목, 남은 위험을 짧게 전하고 경로를 알려 준다. `stage:"done"`.

### 한 번에 실행

설계 승인 직후 3~6 을 하나로 돌려도 된다(위 게이트 규칙이 스크립트에 구현돼 있음):

```
Workflow({ name: "sdlc:deliver", args: { dir, baseRef, maxCycles: 2, history } })
```

단계별 호출은 Claude 가 결과를 읽고 설계 결함 여부를 판단할 수 있어 기본으로 권장하고, `deliver` 는 무인 실행용이다.

### dev-toolkit 보강 연계 (선택)

sdlc 리프는 이미 dev-toolkit 전문 **에이전트**(리뷰어·architect·test-automator 등)를 쓴다. 더 나아가 dev-toolkit **완성 워크플로**를 연계할 수 있는데, **중첩 1단 제한**(workflow 안에서 또 workflow 를 부르면 런타임이 던짐) 때문에 배치 층이 갈린다.

- **세션/스킬 층(여기)** — 중첩 제한 없음. 필요하면 각 단계 전후에 `Workflow` 로 직접 호출하고 결과(마크다운)를 읽어 사용자에게 전하거나 다음 단계 컨텍스트로 준다. **오케스트레이터도 호출 가능**:
  - 분석 전(큰 모듈·온보딩): `Workflow({ name: "dev-toolkit:codebase-map", args: { target: <경로> } })` → 구조 맵을 분석서 참고로.
  - 이관 작업: `Workflow({ name: "dev-toolkit:migration-readiness", args })` → 준비도.
  - 병합 전 종합 판정: `Workflow({ name: "dev-toolkit:pre-merge-gate", args })` → GO/NO-GO. (오케스트레이터라 `deliver` 안에서는 못 부른다 — 세션 층에서만.)
- **deliver 층(보강 phase)** — `deliver` args 에 `augment: true` 를 주면 test↔review 수렴 뒤 **dev-toolkit 리프**(impact-analysis; 변경에 SQL/매퍼면 sql-db-audit; 이관이면 migration-verify)를 1단 형제로 1회 호출해 **report 의 "보강 분석" 절**로 싣는다. `coverage: true` 면 test-coverage-boost(테스트 생성)도. **게이트에는 반영하지 않는다** — 자율 사이클 판정은 sdlc 리프 구조화 반환만으로(결정성 보존).

  ```
  Workflow({ name: "sdlc:deliver", args: { dir, baseRef, maxCycles: 2, augment: true } })
  ```
- 보강은 비용이 크므로 **기본 off(opt-in)**. 범위를 좁게 두고 `deliver` 는 `large` 규모로 둔다.

## 규칙

- 어떤 단계도 **git commit·push 하지 않는다**. 커밋·PR 은 보고서 후 사용자가 요청할 때만.
- 분석·설계 문서를 사용자 승인 없이 다음 단계로 넘기지 않는다. 반대로 구현 이후 단계에서는 승인을 구하지 않는다.
- 워크플로 결과에 없는 점수·통과 여부를 지어내지 않는다. 실패·미달은 그대로 전한다.
- 워크플로 규모: 리프 단계는 수~수십 에이전트, `deliver` 는 합산된다. `/config` 의 Dynamic workflow size 를 `medium` 이상(`deliver` 는 `large`)으로 둔다.
