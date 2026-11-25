# dev-toolkit 동적 워크플로우

멀티 에이전트를 조율하는 JavaScript 오케스트레이션 스크립트. 플러그인에 담겨 배포되며, 설치하면
슬래시 커맨드가 된다. 내재화한 리뷰어·DB 에이전트를 `agentType`으로 워커로 디스패치하고,
전용 에이전트가 없는 차원은 프롬프트에 스킬(`mybatis-patterns`·`postgres-patterns` 등)을 명시해 보강한다.

| 커맨드 | 하는 일 | 입력(args) |
|---|---|---|
| `/dev-toolkit:review-changes` | 변경 파일을 유형별(Java·SQL/매퍼·프론트·이관/스키마)로 분류 → 전문 리뷰어 팬아웃 → 지적 반박 검증 → 심각도순 단일 리포트 | PR 번호·브랜치·경로. 없으면 작업 트리(git diff HEAD) |
| `/dev-toolkit:sql-db-audit` | SQL/매퍼/DDL 수집 → 정확성·5방언 일관성·PG 이관함정·최적화/스키마 다차원 병렬 감사 → 검증 → 리포트 | 경로·글롭·PR·브랜치. 없으면 작업 트리의 SQL/매퍼/DDL |
| `/dev-toolkit:migration-verify` | 이관 단위 수집 → 접근/위험·동등성·이관함정·롤백/무중단·테스트공백 검증 → 완전성 보강 1회 → 이관 검증 리포트 | 경로·PR·브랜치. 없으면 작업 트리의 이관 관련 변경 |
| `/dev-toolkit:impact-analysis` | 변경 식별 → 호출·데이터·화면·모듈 4각도 멀티모달 스위프 → 영향 검증 → 회귀 테스트 계획 | PR·브랜치·경로·심볼. 없으면 작업 트리의 변경 |
| `/dev-toolkit:codebase-map` | 대상을 영역으로 구획 → 영역별 병렬 리더 요약 → 아키텍트가 아키텍처 맵으로 통합 | 경로·모듈. 없으면 레포 전체 |
| `/dev-toolkit:test-coverage-boost` | 테스트 공백 탐색 → 유닛별 **새 테스트 파일 생성**(기존 미수정) → 빌드 1회 검증 → 보강 보고 | 경로·모듈. 없으면 작업 트리의 변경 유닛. ⚠️ 레포에 파일 생성 |
| `/dev-toolkit:design-approaches` | 설계 브리프 → 서로 다른 각도로 N개 접근안 생성 → 심사 패널 채점 → 최고안+장점 접목 설계안(결정 기록) | 설계 브리프(무엇을·목표·제약). 코드 대상 아님 |
| `/dev-toolkit:db-diff` | 2개 이상 DB의 정규 스키마 스냅샷(계약)의 구조 차이를 **결정적으로 계산** → 에이전트가 이관 심각도·방언 함정 분류(전수, 삭제 불가) → 심각도순 이관 리포트+ADR. opt-in으로 데이터 프로파일(행수·NULL비율·distinct) 차이도. **DB 직접 접속 안 함**(스냅샷 없으면 읽기 전용 조회 지시서 출력 → 외부 DB 조회 도구로 떠서 재투입) | 스냅샷 2개+(파일 경로/인라인 JSON) + scope. `options.dataProfile`·`profiles` |

> SDLC 매핑: **분석**(codebase-map·impact-analysis) · **설계**(design-approaches) · **테스트**(test-coverage-boost) · **유지보수·이관**(review-changes·sql-db-audit·migration-verify·db-diff). 구현은 전용 워크플로를 두지 않는다(병렬 코드 생성은 충돌·중복 위험 — `feature-dev`/대화가 적합).

### 연계(오케스트레이터)

위 리프들을 **리프**로 두고, `workflow('dev-toolkit:<리프>', args)` 로 엮어 하나의 판정/문서로 합성한다.
**중첩은 1단만** — 오케스트레이터는 리프를 호출하지만, 오케스트레이터끼리는 호출할 수 없다.
리프 팬아웃이 **합산**되므로 에이전트 수가 크다(설치 규모 `large` 권장, 범위는 좁게).

| 커맨드 | 엮는 리프 | 산출 |
|---|---|---|
| `/dev-toolkit:pre-merge-gate` | review-changes + sql-db-audit + impact-analysis | 병합/배포 전 **GO/NO-GO 게이트** |
| `/dev-toolkit:migration-readiness` | migration-verify + impact-analysis + db-diff | **이관 준비도** 리포트(읽기 전용; 테스트 생성은 test-coverage-boost 별도) |
| `/dev-toolkit:onboard-pack` | codebase-map + sql-db-audit | 모듈 **온보딩 팩**(구조+DB 품질) |

- 리프는 순차 실행하고(동시성·토큰 예산 공유라 예측 가능), 실패한 리프는 "미실행"으로 표시하고 계속한다.
- 이름 해석(`dev-toolkit:<리프>`)은 설치 후 런타임에서만 검증된다.
- `db-diff`는 migration-readiness에 리프로 합류돼 있다. 단 DB 구조 차이를 실제로 보려면 **복합 args**(`{target, targets, scope, options}`)로 DB 스냅샷(targets)을 함께 넘겨야 한다 — 없으면 db-diff는 "스냅샷 필요" 안내만 하고 준비도 리포트엔 그렇게 표시된다(설계: `docs/design/db-diff.md`).

## 구조

둘 다 **팬아웃 → 검증 → 요약** 파이프라인이다(단계 간 배리어 없음).

- `review-changes`: 분류 1개 → 파일별 리뷰 → 지적별 반박 검증 → 요약 1개.
  라우팅: java→`java-reviewer`, sql_mapper→`sql-pro`(+5방언·이관함정 프롬프트), react/vue/ts→각 리뷰어,
  migration·schema→`database-architect`. config·other는 생략.
- `sql-db-audit`: 수집 1개 → 파일별 4차원 병렬(correctness=`sql-pro`, dialect·pg_trap=기본 워커+스킬,
  optimize=`database-optimizer` 또는 ddl이면 schema=`database-architect`) → 지적별 검증 → 리포트 1개.
- `migration-verify`: 수집 1개 → 단위별 5차원 병렬(approach_risk=`legacy-modernizer`, equivalence=`sql-pro`,
  dialect_trap·rollback_safety=기본 워커+스킬, test_gap=`test-automator`) → 지적별 검증 →
  **완전성 비평가가 미점검 위험을 찾아 1회 보강** → 리포트 1개. 다른 둘과 달리 완전성 루프가 있다.
- `impact-analysis`: 변경 식별 1개 → 4각도(caller·data·ui·module) 멀티모달 스위프(기본 워커+change-impact·
  mybatis-patterns·click-path-audit·module-regression 스킬) → 중복 제거 → 영향 검증 → `module-regression` 기반 회귀 계획.
- `codebase-map`: 구획 1개 → 영역별 병렬 리더(`architect`+codebase-onboarding) → `architect` 통합. (읽기 전용, Understand 패턴)
- `test-coverage-boost`: 공백 탐색 1개 → 유닛별 `test-automator`가 **새 테스트 파일 생성**(병렬, 기존 미수정·빌드 안 함) →
  `java-build-resolver`가 빌드 1회 → 보고. **유일하게 레포를 변경(파일 생성)하는 워크플로** — 커밋 전 리뷰할 것.
- `design-approaches`: 3각도(mvp·scale·risk) 접근안 생성(`architect`) → 접근안마다 4렌즈 심사 패널 채점 →
  최고안 중심 + 장점 접목 설계안 합성(`architect`, ADR 형식). 입력은 코드가 아니라 **설계 브리프**(args).
- `db-diff`: 수집 1개(허용목록 투영 — 계약 외 필드 전부 폐기) → **결정적 구조 차이 계산**(테이블·컬럼·인덱스·PK·
  타입·NULL·기본값을 JS로, `computeDiffs`) → 쌍별 `database-architect`가 심각도·방언 함정 분류(전수, **삭제 불가**;
  에이전트 누락 시 결정적 diff로 백필 → 완전성 구조적 보장) → `database-architect` 리포트(+ADR).
  **적대적 verify 미사용**: 구조 diff는 환각이 아니라 계산된 사실이라, 다른 워크플로의 반박 검증을 그대로 쓰면
  진짜 차이(예: 삭제된 테이블, tinyint→boolean)를 지우는 역효과가 스모크 테스트에서 확인됨 — 대신 결정적 계산 +
  분류(등가 노이즈는 삭제 않고 low "방언 등가"로 표시)로 대체. **DB 비접속**: 스냅샷 계약만 소비(접속정보·행값
  필드 구조적 부재 = 보안). 스냅샷은 신뢰불가 데이터로 delimit 블록(위조 방지)에 싣고 라벨은 strict charset
  제한(간접 프롬프트 주입 방지). 스냅샷 2개 미만이면 읽기 전용 조회 지시서 출력 후 종료. **data_profile**(opt-in,
  `options.dataProfile=true`)은 값 없는 별도 집계 계약(`args.profiles`: 행수·NULL비율·distinct만)을 받아 결정적
  프로파일 diff를 `database-optimizer`로 분류한다(실제 값·min/max·샘플은 투영에서 폐기 → 유출 불가). migration-readiness에 합류.

## 전제·주의

- **설치 전제**: 이 워크플로가 디스패치하는 에이전트(sql-pro·database-optimizer·database-architect 등)는
  모두 dev-toolkit에 함께 들어 있다. 플러그인을 설치하면 함께 해결된다.
- **규모(비용)**: 파일 수 × 차원 수만큼 에이전트가 늘어난다. Pro 기본 규모 가이드는 `small(<5)`이므로
  실제 변경 규모에서는 `/config`의 **Dynamic workflow size**를 `medium`/`large`로 올려야 한다.
  변경이 크면 경로·PR로 범위를 좁혀 호출하는 편이 좋다.
- **실행 승인**: 동적 워크플로우는 명시적 opt-in에서만 실행된다(프롬프트에서 요청하거나 커맨드로 실행).
  권한 규칙 `Workflow` 또는 `Workflow(review-changes)`로 허용할 수 있다.
- 자체 저작물(외부 내재화 아님).
