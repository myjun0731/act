# 출처 (Attribution)

이 플러그인의 스킬은 외부 MIT 라이선스 프로젝트에서 선별 내재화했다.

## 에이전트 평가·보안·벤치마크
- agent-security-hardening, benchmark-optimization-loop — 출처 ECC (https://github.com/affaan-m/ECC), MIT, © 2026 Affaan Mustafa
- agent-architecture-audit — 출처 oh-my-agent-check (ECC 경유 재배포), MIT

## 멀티에이전트·병렬·자율 루프
- parallel-execution-optimizer, agentic-os, loop-design-check, continuous-agent-loop,
  iterative-retrieval, cost-aware-llm-pipeline — 출처 ECC, MIT
- blueprint — 출처 community (ECC 경유 재배포), MIT

각 스킬의 SKILL.md frontmatter에 origin/license를 보존했다. 재배포 시 본 표기를 유지할 것.

## 4차 추가 (에이전트 하네스·디버깅)
agent-harness-construction, agent-introspection-debugging — 출처 ECC, MIT

## 5차 추가 (ECC 내재화 W3, 0.4.0)
agentic-engineering, ai-first-engineering, agent-eval, eval-harness, recursive-decision-ledger, regex-vs-llm-structured-text,
token-budget-advisor, data-scraper-agent, agent-payment-x402, santa-method — 출처 ECC@`4adeee6`, MIT
- 원 기여자: santa-method — Ronald Skelton (RapportScore.ai). token-budget-advisor·data-scraper-agent·agent-payment-x402 — origin `community`.
- 변경: agent-eval·eval-harness·recursive-decision-ledger — 스킬 frontmatter의 무의미한 `tools:` 삭제.
  santa-method — 연동 표의 `Verification Loop` → `verification-before-completion`(dev-toolkit), ECC 전용 `Continuous Learning v2` 행 삭제, `Strategic Compact` → 일반 "Context compaction".
  token-budget-advisor — `context-budget`(W4 예정) 링크를 빼고 그 스킬이 쓰던 추정식만 남김.

## 6차 추가 (ECC 내재화 W4, 0.4.0에 포함)
agent-runtime-gateway-smoke-test, agent-self-evaluation, autonomous-loops, context-budget, council, council-multi-model, dev-team,
dmux-workflows, dynamic-workflow-mode, enterprise-agent-ops, gan-style-harness, hookify-rules, prompt-caching-strategy,
ralphinho-rfc-pipeline, rules-distill, skill-comply, skill-host-compat, team-agent-orchestration, team-builder — 출처 ECC@`4adeee6`, MIT
- 원 기여자: dev-team·team-builder — origin `community`, gan-style-harness — `ECC-community`.
- ECC 런타임 제거: autonomous-loops의 NanoClaw REPL 섹션(표·목차 포함), dmux-workflows의 ECC Helper 섹션, gan-style-harness의 `/project:gan-*` 커맨드·`gan-harness.sh` 실행 경로(수동 `claude -p` 루프만 남김), dynamic-workflow-mode의 ECC2 문장, team-agent-orchestration의 Hermes, skill-host-compat의 ECC 저장소 검증 스크립트(수동 점검 절차로 대체).
- hookify-rules: 공식 `hookify` 플러그인 필요를 맨 위에 명시하고, ECC 전용 런타임 설명을 빼고 커맨드를 공식 플러그인 이름(`/hookify:list` 등)에 맞췄다.
- **skill-comply 보안 수정**: 시나리오 에이전트(`claude -p`)에 호스트 환경변수 전체와 무제한 Bash를 넘기던 것을, 허용목록 환경변수와 범위를 좁힌 Bash 규칙(+ curl·wget·ssh·WebFetch 등 차단)으로 바꿨다. 원본에 있던 셋업 명령 검사의 빈틈 2개도 막았다 — `tar --file=host:archive`(원격 셸 실행) 형태를 거부하고, `npm install`은 sandbox에 `.npmrc`·`.yarnrc` 등이 있으면 거부하며 호스트 사용자·전역 npmrc를 읽지 않는다(`git=` 같은 설정이 다른 프로그램을 실행할 수 있음). SKILL.md에 보안 주의를 추가하고 테스트 데이터의 `tdd-workflow`를 `test-driven-development`로, 테스트 환경변수 `ECC_*`를 `SKILL_COMPLY_*`로 바꿨다.
- council-multi-model: 스크립트 경로를 `${CLAUDE_PLUGIN_ROOT}` 기준으로, 임시 폴더 접두어 `ecc-council-review-` → `council-review-`. 이 스크립트는 명시적 동의가 있을 때만 OpenAI Codex로 내용을 보낸다(원본 그대로).
- 그 외 공통: `verification-loop`·`tdd-workflow` → dev-toolkit 이름, ECC 에이전트·커맨드 참조를 act 에이전트나 일반 지시로, 최상위 `origin`·`tools:` 키 정리.
- 제외: plan-canvas(ECC 캔버스 런타임 필요). roundhouse-x402는 보류(실제 자금 결제 안내 — 사용자 결정 대기).
