# 출처 (Attribution)

아래 항목은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)에서 선별 내재화했다.

리뷰어 에이전트: security-reviewer, typescript-reviewer, react-reviewer, vue-reviewer
QA 스킬: browser-qa, ai-regression-testing, test-collaboration, windows-desktop-e2e

각 파일의 frontmatter 메타데이터를 보존했다. 재배포 시 MIT 표기를 유지할 것.
(나머지 dev-toolkit 스킬은 act 자체 저작물.)

## 2차 추가 (배포·아키텍처)
스킬: docker-patterns, deployment-patterns, canary-watch, hexagonal-architecture (출처 ECC, MIT)
에이전트: architect (출처 ECC, MIT)

## 3차 추가 (아키텍처·데이터·빌드)
스킬: contract-first, data-throughput-accelerator, backend-patterns (출처 ECC, MIT)
에이전트: build-error-resolver (출처 ECC, MIT; Node/TS 빌드용 — java-build-resolver 보완)

## 4차 추가 (분석·관측·성능·설정)
codebase-onboarding, dashboard-builder, benchmark, config-health — 출처 ECC, MIT

## 5차 추가 (문서)
스킬: living-docs-governance, documentation-lookup (출처 ECC, MIT)
에이전트: doc-updater (출처 ECC, MIT)

## 6차 추가 (ECC 내재화 W2, 0.11.0)
스킬: coding-standards, error-handling, content-hash-cache-pattern, latency-critical-systems, code-tour, terminal-opener (출처 ECC@`4adeee6`, MIT)
- terminal-opener: ECC 기여자 haelyra (원본에 origin 없음 → `community`로 기록)
- 변경: coding-standards — ECC 규칙 파일 안내 삭제, `frontend-patterns`를 web-frontend 플러그인 조건부 안내로, "narrower ECC skill" → "narrower skill".
  code-tour — 관련 목록에서 `council`(act 미보유) 삭제. latency-critical-systems — 스킬 frontmatter에 무의미한 `tools:` 삭제.
  terminal-opener — Codex 메타(`agents/openai.yaml`) 삭제, 스크립트 경로를 `${CLAUDE_PLUGIN_ROOT}` 기준으로, 환경변수 `ECC_TERMINAL` → `TERMINAL_OPENER`, description의 "Codex" → "you".

## 7차 추가 (ECC 내재화 W5 — 외부 MCP·API 필요, 0.11.0에 포함)
스킬: api-connector-builder, codehealth-mcp, web-research-mcp, exa-search, jira-integration, knowledge-ops, mailtrap-email-integration, plankton-code-quality (출처 ECC@`4adeee6`, MIT)
- 원 기여자: codehealth-mcp·plankton-code-quality — origin `community`(Plankton 원작 @alxfazio 표기 유지). api-connector-builder — `ECC direct-port adaptation`.
- **web-research-mcp**: ECC `deep-research`를 이름만 바꿔 넣었다(다른 `deep-research` 스킬과 충돌 방지).
- 외부 의존이 있는 스킬은 제목 아래에 `> **Requires:**` 줄로 필요한 MCP·API 키·도구를 적었다.
- 변경: codehealth-mcp — ECC MCP 템플릿·`ECC_DISABLED_MCPS`·"Pairing with ECC" 표를 일반 안내로, `verification-loop`·`tdd-workflow`·`/quality-gate` → dev-toolkit 이름. plankton-code-quality — "Pairing with ECC"·"ECC v1.8 Additions"(`ECC_HOOK_PROFILE` 등)를 걷어내고, act `core`의 Prettier 훅과 충돌할 수 있다는 안내로. exa-search — 관련 스킬을 `web-research-mcp`로, `market-research`(제외) 삭제. api-connector-builder — `mcp-server-patterns` → `mcp-builder`, `github-ops` 삭제. mailtrap — 최상위 `origin` → `metadata`.

---

아래 항목은 wshobson/agents(https://github.com/wshobson/agents, MIT License, © 2024 Seth Hobson)에서 선별 내재화했다.
(ECC가 아닌 별도 소스. 커밋·라이선스 원문은 `THIRD_PARTY_NOTICES.md` 참조.)

## 6차 추가 (스택 심화 — wshobson/agents, MIT)
에이전트: java-pro, sql-pro, database-architect, database-optimizer, legacy-modernizer, test-automator
스킬: postgresql-table-design, sql-optimization-patterns, database-migration
- 에이전트의 `name:`에서 플러그인 접두사만 제거(예: `database-design-database-architect` → `database-architect`), 본문은 원본 그대로.
- 스킬은 `references/details.md`까지 함께 가져왔고, frontmatter에 `metadata.origin: wshobson/agents`를 추가.
