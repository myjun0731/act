# 결함 리포트: sdlc 0.4.0 설계 단계 작성 에이전트가 설계서를 쓰지 못함

| 항목 | 내용 |
|---|---|
| 대상 | `plugins/sdlc/workflows/design.js` (sdlc 0.4.0, 레포 release 1.12.0-dev.15 / ffba93e) |
| 심각도 | 높음. 설계 단계가 항상 실패하고, 실패가 점수 미달로 위장된다. |
| 발생 빈도 | 항상. dev-toolkit이 설치된 환경이면 매번 재현된다. |
| 발견 | 2026-11-26 `/sdlc:pipeline` 설계 단계 실행 중 |
| 상태 | 수정됨: sdlc 0.4.1(마켓 1.12.1). 제안 1~4를 모두 반영했다. 상세는 CHANGELOG `[1.12.1]`. |

## 1. 증상
- 설계 라운드마다 `02-design.rN.md` 파일이 생기지 않는다.
- 심사 패널 3명이 모든 기준에 0~5점을 준다. 지적은 "평가 대상 02-design.rN.md 파일이 없음"뿐이다.
- 워크플로는 결함을 알아채지 못한다. 점수 미달로 보고 다음 라운드를 계속 돌리고, `maxRounds` 또는 `patience`에 걸릴 때까지 비용만 쓴다.
  - 실제 사례에서는 2라운드 동안 작성 2회와 심사 6회가 모두 헛돌았다. 3라운드 작성 도중에 사람이 수동으로 중단했다.
- 작성 에이전트는 자기가 실패했다고 반환했다. 아래는 그 반환을 요약한 것이다.
  - 1라운드: "02-design.r1.md 를 쓰지 못했습니다. 이번 실행에는 Read·Grep·Glob·SubagentHandback 도구만 있습니다."
  - 2라운드: 설계서 본문을 반환값에 실어 보내면서 "Write 도구가 없어서 파일을 만들 수 없었다"고 알렸다.

## 2. 재현 절차
1. dev-toolkit 0.10.x와 sdlc 0.4.0을 설치한다.
2. 임의의 요청으로 `/sdlc:pipeline`을 시작해 분석 단계를 통과시킨다. 분석 단계는 정상 동작한다.
3. `Workflow({ name: "sdlc:design", args: { dir, quality: { level: "standard" } } })`를 호출한다.
4. 결과:
   - `<dir>/02-design.r1.md`가 없다.
   - journal에 `작성 r1` 결과로 실패 문자열이 남는다.
   - `평가 r1:*` 점수는 0~5다.
   - 이후 라운드도 같다.

## 3. 원인

### 3.1 작성 에이전트 타입 지정 오류 (주 원인)
`plugins/sdlc/workflows/design.js:85-93`
```js
const out = await agent(
  `...완성본을 ${path} 에 쓰고, 쓴 경로 한 줄만 반환하라. 코드 파일은 수정하지 마라.`,
  { agentType: 'dev-toolkit:architect', phase: '작성', label: `작성 r${round}` },   // :91
)
return out ? path : null                                                            // :93
```
- 작성 에이전트로 지정된 `dev-toolkit:architect`는 도구가 `tools: Read, Grep, Glob`뿐이다.
  - 근거: `plugins/dev-toolkit/agents/architect.md:4`. 0.10.0, 0.10.1, 0.10.2 모두 같다.
- 그런데 프롬프트는 파일 작성을 요구한다. 그래서 이 조합으로는 구조적으로 성공할 수 없다.
- 분석 단계 `analyze.js:86-93`의 작성 에이전트는 `agentType`을 지정하지 않는다. 기본값인 general-purpose가 쓰여 쓰기 도구가 있고, 그래서 정상 동작한다.

### 3.2 작성 결과를 검증하지 않음 (실패가 위장되는 원인)
- `design.js:93`의 `return out ? path : null`은 반환값이 비어 있지 않으면 성공으로 처리한다.
- 실패를 알리는 문장이 반환돼도 `path`를 돌려준다. 그 결과 존재하지 않는 파일을 심사 패널이 채점하게 된다.
- "작성 실패"가 "품질 미달"로 기록되므로 사용자는 원인을 알 수 없다.

## 4. 다른 단계 점검 결과
`grep -n "agentType" plugins/sdlc/workflows/*.js` 결과를 각 에이전트 정의의 `tools`와 대조했다.

| 위치 | agentType | 요구 동작 | 도구 | 판정 |
|---|---|---|---|---|
| design.js:91 | dev-toolkit:architect | 설계서 파일 작성 | Read, Grep, Glob | **결함** |
| design.js:133 (작업 목록 추출) | 미지정 (general-purpose) | 파일 복사·JSON 저장 | 전체 | 정상 |
| implement.js:139 | dev-toolkit:build-error-resolver | 빌드 수정 | Read, Write, Edit, Bash, Grep, Glob | 정상 |
| test.js:73 | dev-toolkit:test-automator | 테스트 파일 작성 | 전체 | 정상 |
| review.js:97-102, 126 | java-reviewer 등 리뷰어 | 지적 반환(schema) | 읽기와 Bash | 정상. 쓰기를 요구하지 않음 |
| review.js:138 | dev-toolkit:security-reviewer | 지적 반환(schema) | Read, Grep, Glob, Bash | 정상 |

쓰기를 요구하는 곳에 읽기 전용 에이전트를 지정한 곳은 design.js:91 하나다.

## 5. 수정 제안
1. **에이전트 타입 교체.** design.js:91에서 `agentType`을 빼서 general-purpose를 쓰게 한다.
   - architect의 설계 관점이 필요하면, 접근안 단계(design.js:53)에서 architect에게 읽기 전용 검토만 맡긴다.
   - 문서 작성은 쓰기 도구가 있는 에이전트에게 맡긴다.
2. **작성 결과 검증.** 작성 뒤 파일이 실제로 있는지 확인한다.
   - 예: schema로 `{ written: boolean, path }`를 받고, `written=false`이면 `stopReason: "error"`로 즉시 중단하고 원인을 반환한다.
   - 같은 패턴인 `analyze.js:93-94`에도 적용한다.
3. **심사 전 차단.** 심사 패널이 "대상 파일 없음"을 반환하면 점수 0으로 루프를 계속 돌지 않는다. 오류로 종료한다.
4. **회귀 방지.** 워크플로가 요구하는 동작과 에이전트 `tools`를 대조하는 정적 검사를 추가한다.
   - 예: 프롬프트에 "에 쓰고·저장하라"가 있는 agent() 호출의 agentType이 Write를 갖는지 확인한다.
   - 이 검사를 릴리스 체크에 넣는다.

## 6. 우회 방법 (수정 배포 전)
- 실행할 때마다 생성되는 세션 스크립트 `~/.claude/projects/<proj>/<session>/workflows/scripts/design-<runId>.js`를 연다.
- 91행의 `agentType`을 `'general-purpose'`로 바꾼다.
- `Workflow({ scriptPath, resumeFromRunId, args })`로 재실행한다.
- 접근안 단계 결과는 캐시에서 재사용된다.

## 7. 영향
- 0.4.0 설계 단계를 쓰는 모든 파이프라인은 설계서를 만들지 못한다. 이후 구현·테스트·리뷰·보고서 단계로 진행할 수 없다.
- `sdlc:deliver`는 설계 승인 뒤에 실행되므로 직접 영향은 없다. 다만 앞 단계가 막혀 있어 실행할 수 없다.
- 배포 패키지 3종(PRO, INTERNAL, skills-pack)에 sdlc가 들어 있다면 모두 같은 결함이 있다. 배포 전에 각 패키지 포함 여부를 확인해야 한다.
