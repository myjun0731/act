# CHANGELOG

릴리스마다 `## [마켓플레이스 버전] - 날짜` 섹션을 하나씩 추가한다. `scripts/release.py`는 이 섹션이 없으면 태그를 만들지 않는다.

## [1.11.0] - 2026-11-24

`dev-toolkit` 0.9.0 → 0.10.0: wshobson/agents(MIT)에서 스택 심화 항목을 선별 내재화. ECC가 아닌 새 소스.
- 에이전트 6개: java-pro, sql-pro, database-architect, database-optimizer, legacy-modernizer, test-automator
  - 기존 리뷰어(java-reviewer·database-reviewer)를 보완하는 "구현/설계 전문" 에이전트. 메이저 버전 이관엔 legacy-modernizer.
- 스킬 3개: postgresql-table-design, sql-optimization-patterns, database-migration (각 references/details.md 포함)
- 에이전트 `name:`의 플러그인 접두사만 제거, 스킬 frontmatter에 `metadata.origin` 추가. 본문은 원본 그대로.
- 출처는 `plugins/dev-toolkit/ATTRIBUTION.md`·`THIRD_PARTY_NOTICES.md`(커밋 34e50fe, MIT © Seth Hobson)에 보존.
- 참고: `database-migration`(단수, ORM 마이그레이션)은 기존 `database-migrations`(복수, 범용 패턴)와 이름이 비슷하다.

릴리스 도구에 `scripts/check_refs.py`(이름 참조 무결성 검증) 추가 — marketplace.json 로컬 플러그인만 스캔해 워크플로의 `workflow('ns:name')`·`agentType:'ns:name'`·프롬프트 스킬명을 인벤토리와 대조. 리터럴 미해석=ERROR, 타 플러그인 전용 스킬=WARN(단독 설치 누락), 유사중복=INFO. `release.py` validate 직후 호출(try-격리), ERROR는 항상 차단·WARN은 rc/ga에서만 차단. design-approaches 워크플로가 설계·발견한 드리프트(blueprint 교차참조, database-migration(s) 중복)를 자동 포착. 포착된 `blueprint` 교차참조는 design-approaches.js 프롬프트에서 제거(나머지 4개 설계 스킬은 모두 dev-toolkit에 존재) → refcheck WARN 0. 워크플로 내용이 바뀌었으므로 `dev-toolkit` 0.10.0 → 0.10.1 범프(브랜치 추적 채널에서 `claude plugin update`가 버전 문자열 변화로 수정을 받도록).

또한 동적 워크플로우 7종을 `plugins/dev-toolkit/workflows/`에 추가(자체 저작물). 내재화한 리뷰어·DB 에이전트를 `agentType`으로 워커 디스패치하는 팬아웃→검증→합성 파이프라인.
- `/dev-toolkit:review-changes` — 변경 코드 유형별 다차원 리뷰·검증·단일 리포트
- `/dev-toolkit:sql-db-audit` — SQL/매퍼/DDL 다차원(정확성·5방언·PG 이관함정·최적화/스키마) 감사·검증·리포트
- `/dev-toolkit:migration-verify` — 이관 단위 검증(접근/위험·동등성·이관함정·롤백/무중단·테스트공백) + 완전성 보강 1회. 도메인 고유 검증은 도메인 플러그인 몫, 여기엔 제네릭 골격.
- `/dev-toolkit:impact-analysis` — 변경 영향 4각도 멀티모달 스위프 → 검증 → 회귀 테스트 계획
- `/dev-toolkit:codebase-map` — 영역 구획 → 병렬 리더 → 아키텍처 맵 통합(읽기 전용, 온보딩)
- `/dev-toolkit:test-coverage-boost` — 테스트 공백 탐색 → 유닛별 새 테스트 파일 생성 → 빌드 검증 → 보고(**레포 변경**)
- `/dev-toolkit:design-approaches` — 설계 브리프 → N개 접근안 생성 → 심사 패널 채점 → 설계안(ADR) 합성. SDLC 설계 단계
- 규모·전제·실행 승인은 `workflows/README.md` 참조. 설치 규모 가이드는 `medium` 이상 권장.

그리고 리프 워크플로를 `workflow()`로 엮는 연계(오케스트레이터) 워크플로 3종 추가. 중첩 1단(오케스트레이터→리프).
- `/dev-toolkit:pre-merge-gate` — review-changes+sql-db-audit+impact-analysis → 병합 전 GO/NO-GO 게이트
- `/dev-toolkit:migration-readiness` — migration-verify+impact-analysis → 이관 준비도(읽기 전용)
- `/dev-toolkit:onboard-pack` — codebase-map+sql-db-audit → 모듈 온보딩 팩
- 오케스트레이터는 리프 팬아웃이 합산되므로 규모 `large` 권장.
- 비용 최적화: 각 워크플로의 기계적 진입 단계(수집·분류·구획)는 `effort: 'low'`로 실행(발견·검증·합성은 기본 effort 유지).

그리고 review-changes 워크플로를 자체 워크플로 패밀리(10개 .js)에 돌려 검증하고(리뷰어 10 팬아웃 → 반박 검증 51건 → 확정 3건, 오탐 48건 제거), 발견한 제어흐름 결함 3건을 수정. `dev-toolkit` 0.10.1 → 0.10.2.
- design-approaches: 심사 결측을 0점이 아니라 합산에서 **제외**하고 유효 점수 **평균으로 정규화**(결측 수가 다른 접근안끼리 공정 비교) — 죽어 있던 `filter`도 실효화.
- review-changes: 리뷰 프롬프트에 `scope`(검토 대상 범위) 전달 — PR·브랜치 대상이면 변경 hunk에 집중, 범위 밖 노이즈 억제.
- test-coverage-boost: 생성된 새 테스트가 0건이면 빌드·테스트 단계를 **건너뜀**.
- 문서 최신화: `README.md`·`plugins/allinone/README.md` 플러그인 표를 실제 상태로 — 버전(dev-toolkit 0.10.2·allinone 0.4.0·obsidian 0.1.2), `agentic` 플러그인 행 추가, dev-toolkit 구성(스킬 48·동적 워크플로 10·에이전트 16) 반영.

정식 승격 전 남은 워크플로(pre-merge-gate·migration-readiness·test-coverage-boost)를 모두 실행해 검증(오케스트레이터 2종 리프 중첩 체이닝 확인, 총 79 에이전트·오류 0). 이 과정에서 test-coverage-boost가 `scripts/check_refs.py`의 잠복 버그를 포착·수정:
- check_refs: 유사중복(INFO) 검사가 `if not wf_dir.is_dir(): continue` 안쪽에 있어 **workflows 디렉터리가 없는 플러그인(agentic·core·design-eng)에 미도달**했다. 별도 루프로 분리해 모든 로컬 플러그인에 적용(ERROR/WARN 게이트엔 영향 없음, INFO 완전성 수정).

`dev-toolkit` 0.8.0 → 0.9.0: ECC(MIT)에서 문서 관련 항목 3개 선별 내재화.
- living-docs-governance — 장수명 프로젝트 문서 노후 방지(헌장·맵·상태)
- documentation-lookup — 최신 라이브러리·프레임워크 문서 조회(Context7)
- doc-updater (에이전트) — 문서·코드맵(docs/CODEMAPS) 자동 갱신
- 출처는 `plugins/dev-toolkit/ATTRIBUTION.md`와 각 frontmatter에 보존.

## [1.9.0] - 2026-11-24

ECC(MIT)에서 분석·관측·에이전트 하네스 스킬 6개 선별 내재화.
- `agentic` 0.2.0 → 0.3.0: agent-harness-construction, agent-introspection-debugging
- `dev-toolkit` 0.7.0 → 0.8.0: codebase-onboarding, dashboard-builder, benchmark, config-health
- 출처는 각 플러그인 ATTRIBUTION.md와 frontmatter에 보존.

## [1.8.0] - 2026-11-24

`dev-toolkit` 0.6.0 → 0.7.0: ECC(MIT)에서 아키텍처·데이터·빌드 항목 4개 선별 내재화.
- contract-first — 프론트/백·서비스 간 계약 기반 조율
- data-throughput-accelerator — 대용량 데이터 이동·ETL·백필 가속
- backend-patterns — 백엔드 아키텍처·API·DB 패턴
- build-error-resolver (에이전트) — Node/TS 빌드·타입 오류 해결(java-build-resolver 보완)
- 출처는 `plugins/dev-toolkit/ATTRIBUTION.md`와 각 frontmatter에 보존.

## [1.7.0] - 2026-11-24

`dev-toolkit` 0.5.0 → 0.6.0: ECC(MIT)에서 배포·아키텍처 스킬 4개와 에이전트 1개 선별 내재화.
- docker-patterns — Docker/Compose 로컬개발 패턴
- deployment-patterns — CI/CD·컨테이너·헬스체크·롤백
- canary-watch — 배포 후 URL·엔드포인트 검증
- hexagonal-architecture — Ports & Adapters, 도메인 경계·의존성 역전
- architect (에이전트) — 시스템 설계·확장성·기술결정
- 출처는 `plugins/dev-toolkit/ATTRIBUTION.md`와 각 frontmatter에 보존.

## [1.6.0] - 2026-11-24

`agentic` 0.1.0 → 0.2.0: ECC(MIT)에서 멀티에이전트·병렬·자율 루프 스킬 7개 내재화.
- parallel-execution-optimizer — 작업을 의존성 그래프·병렬 레인으로 분해, 쓰기 격리 + 최종 검증
- agentic-os — Claude Code 위 영속 멀티에이전트 OS(커널·전문에이전트·파일메모리·스케줄)
- loop-design-check — 자율 루프 실패모드 설계·점검(스피닝·Goodhart·오답완주)
- continuous-agent-loop — 품질게이트·eval·복구 있는 연속 자율 루프
- blueprint — 대형 작업을 1-PR 단위 + 의존성 그래프(병렬)로 분해
- iterative-retrieval — 서브에이전트 컨텍스트 문제 점진 해결
- cost-aware-llm-pipeline — 복잡도별 모델 라우팅·예산·캐싱
- 출처는 `plugins/agentic/ATTRIBUTION.md`와 각 frontmatter에 보존.

## [1.5.0] - 2026-11-24

`dev-toolkit` 0.4.1 → 0.5.0: ECC(MIT)에서 프론트엔드 리뷰어 에이전트 4개와 QA 스킬 4개 선별 내재화.
- 리뷰어 에이전트: security-reviewer, typescript-reviewer, react-reviewer, vue-reviewer
- QA 스킬: browser-qa, ai-regression-testing, test-collaboration, windows-desktop-e2e
- 출처는 `plugins/dev-toolkit/ATTRIBUTION.md`와 각 파일 frontmatter에 보존. install 스크립트·hooks는 미반입.

## [1.4.0] - 2026-11-24

새 플러그인 `agentic` 0.1.0 추가. ECC(MIT, github.com/affaan-m/ECC)에서 에이전트 엔지니어링 스킬 3개를 선별 내재화.
- `agent-security-hardening` — untrusted content 처리 에이전트 런타임 보안 하드닝
- `agent-architecture-audit` — 12층 에이전트 스택 진단(출처 oh-my-agent-check)
- `benchmark-optimization-loop` — 측정 기반 개선 루프(정확도·속도·비용)
- 출처·라이선스는 각 SKILL.md frontmatter와 `plugins/agentic/ATTRIBUTION.md`에 보존.
- `allinone` 0.3.2 → 0.4.0: 의존성에 `agentic` 추가.

## [1.3.0] - 2026-11-23

파괴적 변경. 마켓플레이스 이름을 `myoun-pro` 에서 `claude-pro` 로 바꿨다 (레포명과 일치).
- 설치 명령이 `@myoun-pro` 에서 `@claude-pro` 로 바뀐다. 소스 경로(`myjun0731/claude-pro`)는 그대로.
- 기존에 `@myoun-pro` 로 설치·등록한 사람은 마켓을 재등록한다.
  ```
  claude plugin marketplace remove myoun-pro
  claude plugin marketplace add myjun0731/claude-pro
  ```
  그 뒤 `claude plugin install <플러그인>@claude-pro` 로 다시 설치.
- 이름 변경으로 README가 바뀐 `allinone`, `obsidian` 플러그인 버전을 각각 0.3.2, 0.1.2 로 올림.

## [1.2.0] - 2026-11-22

core 0.4.0
- `/core:setup`이 다른 마켓플레이스의 settings·rules 조각도 받을 수 있게 했다. 단 `settings/base.json`의 `payloadMarketplaces`에 적힌 곳만. 여러 마켓플레이스를 함께 쓰는 PC에서 다른 마켓의 autoMode 정책이 적용되지 않던 문제를 고쳤다.
- 조각은 사용자 범위로 설치된 플러그인에서만 가져온다. 다른 프로젝트에 local 범위로 깐 플러그인은 무시한다.

## [1.1.0] - 2026-11-22

core 0.3.0
- `/core:setup`: 같은 마켓플레이스 플러그인의 `settings-payload/*.json`을 settings.json에 합친다. dict는 재귀로, list는 합집합으로 합치고 `_`로 시작하는 키는 무시한다. 조직 마켓플레이스의 autoMode 정책 같은 설정을 플러그인으로 나눠 줄 때 쓴다.
- 세션 시작 점검: 같은 이름의 플러그인이 여러 마켓플레이스에서 동시에 켜져 있으면 알린다 (예: `core@claude-pro`와 `core@<다른 마켓>`).

## [1.0.1] - 2026-11-22

내용 변경 없음. 표기만 정리했다.
- 작성자 표기에서 소속 약칭을 뺐다 (marketplace.json, 플러그인 5개).
- dev-toolkit `THIRD_PARTY_NOTICES.md`에서 특정 플러그인 이름이 나오는 설명 한 줄을 지웠다.
- 플러그인 버전: allinone 0.3.1, core 0.2.1, design-eng 0.1.1, dev-toolkit 0.4.1, obsidian 0.1.1

## [1.0.0] - 2026-11-22

첫 릴리스.

| 플러그인 | 버전 | 내용 |
|---|---|---|
| allinone | 0.3.0 | 메타 플러그인. 아래 내 플러그인 5개와 공식 플러그인 8개를 함께 설치 |
| core | 0.2.0 | 비밀파일 가드·prettier 훅, 상태줄, `/core:setup`, 메모리 커맨드, 설정 정리·스킬 점검 스킬 4개 |
| dev-toolkit | 0.4.0 | Java·Spring·DB·레거시·설계·디버깅·TDD·PICT·MCP 스킬 28개, 테스트 커버리지 커맨드, 리뷰 에이전트 3개, Java 규칙 원본 |
| design-eng | 0.1.0 | 디자인·애니메이션 스킬 7개 (+ design-for-ai) |
| obsidian | 0.1.0 | Obsidian MCP 서버 (allinone 미포함) |

외부 원본(커밋 고정): design-for-ai `37d7ae6`, overkill `60c7bbb`, recursive-research `15ed326`
