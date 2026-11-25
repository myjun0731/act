# 출처 (Attribution)

아래 항목은 ECC(https://github.com/affaan-m/ECC, MIT License, © 2026 Affaan Mustafa)에서 선별 내재화했다.

리뷰어 에이전트: security-reviewer, typescript-reviewer, react-reviewer, vue-reviewer
QA 스킬: browser-qa, ai-regression-testing, test-collaboration, windows-desktop-e2e

각 파일의 frontmatter 메타데이터를 보존했다. 재배포 시 MIT 표기를 유지할 것.
(나머지 dev-toolkit 스킬은 claude-pro 자체 저작물.)

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

---

아래 항목은 wshobson/agents(https://github.com/wshobson/agents, MIT License, © 2024 Seth Hobson)에서 선별 내재화했다.
(ECC가 아닌 별도 소스. 커밋·라이선스 원문은 `THIRD_PARTY_NOTICES.md` 참조.)

## 6차 추가 (스택 심화 — wshobson/agents, MIT)
에이전트: java-pro, sql-pro, database-architect, database-optimizer, legacy-modernizer, test-automator
스킬: postgresql-table-design, sql-optimization-patterns, database-migration
- 에이전트의 `name:`에서 플러그인 접두사만 제거(예: `database-design-database-architect` → `database-architect`), 본문은 원본 그대로.
- 스킬은 `references/details.md`까지 함께 가져왔고, frontmatter에 `metadata.origin: wshobson/agents`를 추가.
