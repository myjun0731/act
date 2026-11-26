# CHANGELOG

릴리스마다 `## [마켓플레이스 버전] - 날짜` 섹션을 하나씩 추가한다. `scripts/release.py`는 이 섹션이 없으면 태그를 만들지 않는다.

## [1.12.0] - 2026-11-25

`dev-toolkit` 0.10.2 → 0.10.3: 새 동적 워크플로 `db-diff` 추가(동적 워크플로 10 → 11).
- `/dev-toolkit:db-diff` — 2개 이상 DB의 정규 스키마 스냅샷(계약)의 구조 차이를 **결정적으로 계산**하고, 에이전트가 이관 심각도·방언 함정을 분류해 심각도순 이관 리포트+ADR로 합친다. **DB에 직접 접속하지 않는다**(스냅샷 없으면 읽기 전용 조회 지시서 출력 → 외부 DB 조회 도구로 떠서 재투입). 실제 접속 어댑터는 도메인 플러그인 몫(경계).
  - 설계는 `dev-toolkit:design-approaches` 워크플로로 생성(`docs/design/db-diff.md`). 1차(스키마·방언 diff) → 2차(data_profile opt-in: 값 없는 집계 계약으로 행수·NULL비율·distinct 차이).
  - 보안(security-guidance 리뷰 4건 반영): 허용목록 투영(계약 외 필드 폐기), 간접 프롬프트 주입 방어(신뢰불가 데이터 delimit 블록·구분자 위조 방지·라벨 strict charset), 집계 계약은 실제 값·min/max·샘플 미반입.
  - 완전성: 적대적 verify 대신 **결정적 계산 + 백필**(스모크에서 verify가 진짜 차이를 삭제하는 역효과 확인 후 재설계). 방언 등가 노이즈는 삭제 않고 low "방언 등가"로 표시.
  - `migration-readiness` 리프에 합류(복합 args로 스냅샷 제공 시 실제 비교).
- 오케스트레이터 3종(`pre-merge-gate`·`migration-readiness`·`onboard-pack`) 리프 결과를 신뢰불가 데이터 가드로 일괄 하드닝(간접 프롬프트 주입 방지).

`dev-toolkit` 0.10.3 → 0.10.4: 워크플로 토큰 최적화 2차(모델 라우팅). fork-3의 `effort:low`(1차)에 이어 **per-agent `model` 라우팅**을 전 워크플로에 도입.
- **원칙**: `agentType` 디스패치 에이전트(리뷰어·architect·DB·test-automator·java-build-resolver 등 — 실제 지적/설계를 하는 단계)는 **세션 모델(opus) 유지**. 제네릭 저부가 단계만 하향.
  - 수집·분류·구획·스코프(기계) → `haiku`+`effort:low`
  - 채점(design-approaches 렌즈) → `haiku`+`effort:low`, **4렌즈를 접근안당 1호출로 배칭(렌즈 호출 12 → 3)**
  - 검증(반박) → `sonnet`+`effort:low`
  - 제네릭 리포트/합성(agentType 없음) → `sonnet`
- **보존**: 발견/탐색 제네릭 단계(impact 스위프, migration 차원·완전성, sql 방언·함정, db-diff 결정적 계산·분류)는 opus 유지 — 품질 핵심. `pre-merge-gate`의 GO/NO-GO 판정도 opus 유지(병합 차단 결정이라 오판 회피).
- 효과: 최대 소비처 design-approaches의 채점 12호출→3, review/sql/migration의 무한 팬아웃 검증을 sonnet로. 리뷰 품질 저하 없이 토큰 절감.

`dev-toolkit` 0.10.4 → 0.10.5: 스모크 실측 기반 채점 모델 교정. design-approaches를 실행해보니(7에이전트·410k 토큰, 1.24M 대비 ~67%↓) **haiku 배칭 채점이 3회 중 2회 실패**(렌즈 환각 'smoke_probe', 빈 결과)해 순위가 채점 실패의 산물이 됨.
- 채점 모델 `haiku` → `sonnet`(배칭은 유지 — 여전히 opus×12 대비 큰 절감). 다렌즈 1~5점 매핑은 추출이 아니라 판정 작업이라 haiku엔 부적합.
- 환각 방어: 프롬프트에 "주어진 렌즈 키만 사용·새 기준 금지" 명시 + 집계 시 알려진 LENSES 키의 점수만 반영(환각 렌즈·결측 배제). 수집·분류 등 순수 추출 단계는 haiku 유지(판정 아님).

새 플러그인 `sdlc` 0.1.0 추가(자체 저작물) — 분석 → 설계 → 구현 → 테스트 → 리뷰 → 완료 보고서를 동적 워크플로 단위로 연계.
- `/sdlc:pipeline` 스킬: 진행 규약. 분석·설계는 **사용자 관문**(품질 루프 후 승인), 설계 승인 뒤 구현·테스트·리뷰·보고서는 Claude가 묻지 않고 게이트 규칙에 따라 호출. 산출물·재개 상태는 대상 레포 `.sdlc/<slug>/`.
- 워크플로 7종: `analyze`·`design`(품질 루프), `implement`(의존·파일 비중첩 웨이브 병렬 구현 + 빌드 수정), `test`(AC→TC 작성, 실행↔수정 루프, `verify` 모드), `review`(5차원 리뷰 → 반박 검증 → 확정 지적 수정·재테스트), `report`(요구 추적 매트릭스), `deliver`(오케스트레이터: implement → test↔review 최대 N사이클 → report).
- 품질 루프: 심사 패널(관점별 독립 채점, 기준별 0~100) 가중 평균이 `target` 이상 ∧ 모든 기준 `floor` 이상 ∧ `mustHave` 과반 충족일 때 통과. 미달이면 최고본에서 약한 기준부터 보강 반복, `patience` 연속 무개선 시 정체 종료, `maxRounds` 상한. 수준 프리셋 standard 75/60 · high 85/70 · strict 92/80.
- `deliver.js` 는 `LEAVES` 배열로 리프를 선언해 `scripts/check_refs.py` 가 `sdlc:<리프>` 참조를 검증한다.
- `allinone` 0.4.1 → 0.5.0: 의존성에 `sdlc` 추가. 기존 설치는 `claude plugin install sdlc@claude-pro` 로 따로 설치.

`sdlc` 0.1.0 → 0.2.0: dev-toolkit 전문 에이전트/스킬 연계(구현 전 `design-approaches` 워크플로로 접근안 비교·검증 → risk-minimal 안 채택).
- **전문성 주입 이원화**: 페르소나=`agentType`(설치 안전·ERROR급 검증), 방법론·지식=소프트 스킬참조("있으면 적용"). 반박검증·심사 패널·종료 가드는 제네릭 유지(독립 평가자 보존).
- `review` 2계층화: 1계층=제네릭 5차원(설계준수·요구추적은 제네릭 전담 — dev-toolkit 리뷰어는 설계서/AC 모름), 2계층=변경 파일 유형별 전문 리뷰어(java-reviewer·sql-pro·typescript/react/vue-reviewer·database-architect) + `security-reviewer` **보안 상시 레인**(유형 무관 전 변경 1회). 전 디스패치 try/catch → 미설치·오류 시 제네릭으로 완주. findings에 `dim` 부여(5차원 투영).
- `test`→`test-automator`, `implement` 빌드수정→`build-error-resolver`, `design`→`architect`; 각 단계에 test-driven-development·systematic-debugging·설계 스킬 소프트 참조.
- `plugin.json`에 `dependencies: ["dev-toolkit"]` 선언(allinone 번들 전제, 단독 설치 시 자동 동반). 심사 패널·qualityLoop·종료 가드는 불변.

`scripts/check_refs.py`: **선언된 의존성 인식** 추가 — 플러그인이 `dependencies`로 선언한 다른 로컬 플러그인의 스킬을 프롬프트에서 참조하면 더는 WARN이 아니다(동반 설치 보장). sdlc의 dev-toolkit 소프트 스킬 참조 9건이 WARN 0으로 정리(rc/ga strict 통과). 의존성 미선언 cross-plugin 스킬 참조만 WARN 유지.

`sdlc` 0.2.1: 연계 review 스모크(32에이전트)가 포착한 pre-existing 버그 수정.
- `review`: ① 범위 수집 에이전트 실패(null)를 "변경 없음(PASS)"과 구분 — 실패 시 `blocked`+`unresolvedHigh:1`로 게이트가 미해결 취급(거짓 PASS 방지). ② 반박검증 에이전트 실패 시 critical/high 지적을 조용히 폐기하지 않고 "미검증 보존"으로 남김(제네릭·전문 레인 양쪽).
- `deliver`: `maxCycles`를 최소 1로 클램프(0/음수면 검증 사이클 생략→거짓 completed). 빌드는 통과하나 작업 실패가 남으면 `partial` 반영.
- `test`: 실패 그룹화가 겹치는 그룹을 전부 병합(첫 그룹만 합쳐 병렬 수정이 같은 파일을 동시에 건드리던 문제 수정).
- `analyze`: 확정본 복사 에이전트 실패 시 없는 FINAL 경로를 성공으로 반환하지 않고 라운드 본 경로로 폴백.
- 남은 지적(review 수정완료 title 일치, analyze mustHave 정확일치, test 계획 실패 시 기존 테스트만으로 통과)은 후속 과제.

`sdlc` 0.2.2: 남은 후속 지적 3건 수정.
- `review`: 수정 완료 판정을 title 문자열 일치 대신 **번호(n) 기반 매칭**으로 — 에이전트가 title을 바꿔 적어도 fixed 판정이 어긋나지 않음(출력 title은 원본 보존).
- `analyze`·`design` qualityLoop: mustHave 판정을 **정규화 후 부분일치**로(심사자 패러프레이즈 허용), 아무도 판정 못 한 항목은 통과를 막지 않고 '불명' 표기(정확 불일치로 영원히 미통과 되던 문제 방지).
- `test`: full 모드에서 테스트 계획 실패 시 `planFailed` 플래그·경고 로그(새 테스트 없이 기존 테스트만으로 passed가 되는 상황을 가시화).

`sdlc` 0.2.3: 스모크 low 지적 + 수정 중 드러난 잔여 약점 정리(견고성).
- **프로토타입 오염 방지**: 에이전트 반환 key 로 인덱싱하던 plain object를 `Object.create(null)`로 — qualityLoop `per`/`gaps`(analyze·design), review `byType`/`byFile`, test `byFile`. `constructor`/`__proto__` 등이 와도 `.push` TypeError·루프 중단 없음.
- `review`: 제네릭·전문/보안 반박검증을 **단일 `verifyFinding()` 헬퍼**로 통합(복제 제거, 한쪽만 고쳐 어긋날 위험 제거). dedup 키의 title 을 정규화(소문자·공백/구두점 제거 후 30자)해 레인 간 유사 중복을 더 묶음.
- `test`: 실행 에이전트 실패(run=null)를 `stopReason='run-error'`로(이전엔 'maxFixRounds'로 원인 가림, analyze/design의 'error'와 일관).
- `deliver`: 게이트 `clean` 조건에 `!test.planFailed` 추가 — 계획 실패로 새 테스트가 없으면 기존 테스트 통과만으로 통과시키지 않음.

`sdlc` 0.3.0: 토큰 비용 최적화(모델 라우팅). dev-toolkit과 같은 원칙 — 실질 작업은 강 모델, 저부가는 하향. review 스모크가 2.9M까지 가던 비용을 줄인다.
- **유지(기본 모델)**: agentType 전문가(각자 설정)·구현 에이전트(코드 작성)·수정 에이전트(코드 수정).
- **sonnet**: 심사 패널 judges(채점·근거검증 — haiku는 환각으로 부적합), 제네릭 리뷰어(verify가 오탐 거름), 반박검증, 조사, test plan/run, report·record 작성.
- **haiku**: 순수 기계(scope·load·copy·유형 분류).
- 최대 절감처: analyze/design judges(라운드 곱셈)와 review 제네릭 4차원+verify+report.

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
- `allinone` 0.4.0 → 0.4.1: 이번 트레인에서 README(구성 표)가 바뀌었으므로 버전 증가(ga 단계의 "내용 변경 시 플러그인 버전 미증가 차단" 통과용).

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
