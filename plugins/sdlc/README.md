# sdlc

분석 → 설계 → 구현 → 테스트 → 리뷰 → 완료 보고서를 **동적 워크플로 단위로 연계**하는 파이프라인. 각 단계는 제네릭(스택 중립)으로 동작하되, 같은 마켓의 **`dev-toolkit` 전문 에이전트·스킬을 재사용**해 리뷰·구현·테스트 깊이를 끌어올린다(없으면 제네릭으로 완주).

```
/sdlc:pipeline 주문 취소 API 추가 — 품질 high
```

- **분석·설계 = 사용자 관문.** 워크플로 안에서 `작성 → 심사 패널 채점(0~100, 기준별) → 약한 기준부터 보강`을
  사용자가 정한 수준(목표 점수 이상 + 기준별 하한 이상 + 필수 항목 충족)에 도달할 때까지 반복한다.
  끝나면 점수·이력·남은 지적을 보여 주고 승인/피드백 재실행/기준 조정을 사용자에게 받는다.
- **구현 이후 = Claude 자동.** 설계 승인 뒤 implement → test → review → report 를 묻지 않고 호출하며,
  결과에 따라 재시도·재사이클한다(게이트 규칙은 `skills/pipeline/SKILL.md`).
- 산출물은 대상 레포의 `.sdlc/<slug>/`에 쌓이고, `state.json`으로 중단 후 재개한다. 어떤 단계도 커밋하지 않는다.

## 구성

| 커맨드 | 종류 | 하는 일 |
|---|---|---|
| `/sdlc:pipeline` | 스킬(진행 규약) | 준비 → 분석·설계 관문 → 자동 구간 게이트 → 보고 |
| `/sdlc:analyze` | 워크플로 | 코드·요구·위험 병렬 조사 → 분석서 → **품질 루프** → `01-analysis.md` |
| `/sdlc:design` | 워크플로 | 3각도 접근안 → 설계서 → **품질 루프** → `02-design.md` + `02-tasks.json` |
| `/sdlc:implement` | 워크플로 | 의존 순서·파일 비중첩 묶음으로 병렬 구현 → 빌드 검증·수정 → `03-implementation.md` |
| `/sdlc:test` | 워크플로 | AC→TC 테스트 작성 → 실행 ↔ 실패 수정 루프 → `04-test.md` (`mode:"verify"`는 작성 생략) |
| `/sdlc:review` | 워크플로 | **2계층 리뷰** → 지적별 반박 검증 → 확정 지적 수정·재테스트 → `05-review.md` |
| `/sdlc:report` | 워크플로 | 산출물 종합 → 요구 추적 매트릭스 포함 `REPORT.md` |
| `/sdlc:deliver` | 오케스트레이터 | implement → (test ↔ review 최대 N사이클) → report 를 `workflow()`로 한 번에 |

## dev-toolkit 전문성 연계

sdlc는 제네릭 뼈대를 "항상 도는 기본층"으로 두고, dev-toolkit 전문성을 **되돌리기 쉬운 가산 레이어**로 얹는다. 주입 경로를 둘로 나눈다 — **페르소나(다른 리뷰어·에이전트)는 `agentType` 디스패치**, **방법론·지식은 "…스킬 지침이 있으면 적용" 소프트 참조**. 심사 패널·반박 검증·종료 가드는 **제네릭 유지**(독립 평가자를 전문가로 치환하지 않는다).

| 단계 | 전문가(agentType) | 소프트 스킬(있으면 적용) |
|---|---|---|
| review — 유형별 | `java-reviewer` · `sql-pro` · `typescript/react/vue-reviewer` · `database-architect` | — |
| review — 보안 상시 | `security-reviewer` (유형 무관, 전 변경 1회) | — |
| test — 작성 | `test-automator` | `test-driven-development` · `springboot-tdd` |
| implement — 빌드 수정 | `build-error-resolver` | `test-driven-development` · `systematic-debugging` |
| design — 접근안(읽기 전용) | `architect` (미설치·오류 시 제네릭) | — |
| design — 작성 | 제네릭(general-purpose, 쓰기 도구 필요 — 읽기 전용 에이전트 지정 금지) | `api-design` · `hexagonal-architecture` · `contract-first` · `architecture-decision-records` |
| analyze — 작성 | — | `codebase-onboarding` |

**review 2계층** — `5차원 × 변경 파일 전체`(제네릭)와 `파일 유형별 특화`(dev-toolkit)의 축 불일치를 억지로 맞추지 않고 역할을 나눈다.
- **1계층(제네릭·항상):** 설계 준수·요구 추적(분석서 REQ/AC 대조)·정확성·성능·유지보수. 설계서/AC를 아는 이 층의 고유 책임.
- **2계층(가산·선택):** 변경 파일을 유형으로 분류해 유형별 전문 리뷰어로 정확성·보안·성능을 코드 관용구 수준으로 심화.
- **보안 상시 레인:** `security-reviewer`를 유형 무관으로 전 변경에 1회(OWASP·인젝션·권한·시크릿). 제네릭 security 차원과 중복되지 않도록 그 차원은 제네릭에서 제거.
- 두 층·보안 레인의 지적은 모두 동일한 **반박 검증 → 중복 제거 → 수정 → 재테스트**로 흘러간다.

**견고성** — 모든 전문 디스패치는 try/catch로 감싸 **미설치·오류 시 제네릭으로 완주**한다. `plugin.json`에 `dependencies: ["dev-toolkit"]`를 선언(allinone 번들 전제, 단독 설치 시 자동 동반). 에이전트 반환 키로 인덱싱하는 객체는 `Object.create(null)`로 프로토타입 오염을 막고, 반박 검증 실패는 지적을 폐기하지 않고 "미검증 보존"으로 남긴다.

### 풀 워크플로 연계 (에이전트에 더해)

dev-toolkit **완성 워크플로**도 재사용한다. 단 **중첩 1단 제한**(workflow 안에서 또 workflow 금지) 때문에 층이 갈린다:
- **deliver 보강**(opt-in `augment:true`): 수렴 뒤 1회, dev-toolkit **리프**(impact-analysis·sql-db-audit·migration-verify·test-coverage-boost)를 1단 형제로 호출 → report "보강 분석" 절. 게이트엔 미반영(결정성 보존). 오케스트레이터는 금지.
- **세션/스킬 층**(`/sdlc:pipeline`): 중첩 제한 없이 `codebase-map`·`migration-readiness`·`pre-merge-gate` 등 **오케스트레이터까지** 호출. (`skills/pipeline/SKILL.md` 참조)

## 품질 루프 (analyze·design 공통)

```
args.quality = {
  level: "standard" | "high" | "strict",   // 75/60 · 85/70(기본) · 92/80  (목표/하한)
  target: 88, floor: 75,                    // 직접 지정 시 level 보다 우선
  mustHave: ["롤백 절차", "권한 검사 요구"],  // 심사위원 과반이 충족 판정해야 통과
  criteria: [{ key, desc, weight }],        // 기본 기준 대체
  judges: 3, maxRounds: 5, patience: 2
}
```

- 심사위원은 서로 다른 관점(엄격한 검토자·다음 단계 담당자·요청자·사실 검증자·위험)으로 독립 채점한다.
- 점수 = 기준별 심사 평균의 가중 평균. 통과 = `score ≥ target` ∧ `모든 기준 ≥ floor` ∧ `mustHave 게이트 통과`.
- `mustHave` 판정은 심사위원이 프롬프트의 **번호**로 돌려준 항목을 대조한다(번호 없으면 정규화 **정확일치** 폴백 — 부분일치 오매칭 제거). 게이트: 평가된 항목이 하나라도 과반 미충족이면 차단, 필수항목이 있는데 **절반 넘게 미평가면 '심사 누락'으로 차단**, 미평가가 소수일 때만 통과를 막지 않는다(`0/0(미평가)` 표기).
- 보강은 항상 **지금까지의 최고본**에서 출발한다. `patience` 라운드 연속으로 0.5점 넘게 오르지 않으면 정체로 멈춘다.
- 재실행: `previous`(기존 문서)만 주면 먼저 채점, `feedback`도 주면 반영본부터 작성.

**기본 채점 기준**

| 분석 | 가중치 | 설계 | 가중치 |
|---|---|---|---|
| completeness 요구 완전성 | 3 | traceability REQ/AC→설계→TASK→TC | 3 |
| evidence 현황 근거(file:line) | 2 | soundness 구조 타당성·결정 근거 | 2 |
| clarity 판정 가능한 AC | 2 | implementability 작업 구체성·순서 | 2 |
| scope 범위·가정·제약·빌드법 | 1 | testability AC별 테스트 정의 | 2 |
| risk 영향·위험 | 1 | risk 위험·완화·롤백 | 1 |

## 전제·주의

- **의존성:** `dev-toolkit`를 선언한다(전문 리뷰어·에이전트·스킬 재사용). allinone으로 설치하면 함께 깔린다. 단독 설치하면 dev-toolkit가 자동 동반되며, 없더라도 전문 레이어만 생략하고 제네릭으로 동작한다.
- 레포를 변경하는 단계: implement·test·review(fix). **커밋은 하지 않는다** — 보고서를 보고 사용자가 결정.
- 작업 트리가 깨끗한 상태에서 시작하는 것이 좋다(리뷰가 `baseRef` 대비 변경을 본다).
- 규모: 분석·설계 1라운드 ≈ 작성 1 + 심사 N, 구현 ≈ 작업 수 + 2, 리뷰 ≈ 제네릭 4 + 유형 수 + 보안 1 + 지적 수 + 수정 파일 수.
  `/config`의 Dynamic workflow size 를 `medium` 이상(`deliver`는 `large`)으로 둔다.
- 실행 승인은 권한 규칙 `Workflow` 또는 `Workflow(sdlc:*)`로 허용할 수 있다.
- 자체 저작물.
