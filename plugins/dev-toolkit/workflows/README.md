# dev-toolkit 동적 워크플로우

멀티 에이전트를 조율하는 JavaScript 오케스트레이션 스크립트. 플러그인에 담겨 배포되며, 설치하면
슬래시 커맨드가 된다. 내재화한 리뷰어·DB 에이전트를 `agentType`으로 워커로 디스패치하고,
전용 에이전트가 없는 차원은 프롬프트에 스킬(`mybatis-patterns`·`postgres-patterns` 등)을 명시해 보강한다.

| 커맨드 | 하는 일 | 입력(args) |
|---|---|---|
| `/dev-toolkit:review-changes` | 변경 파일을 유형별(Java·SQL/매퍼·프론트·이관/스키마)로 분류 → 전문 리뷰어 팬아웃 → 지적 반박 검증 → 심각도순 단일 리포트 | PR 번호·브랜치·경로. 없으면 작업 트리(git diff HEAD) |
| `/dev-toolkit:sql-db-audit` | SQL/매퍼/DDL 수집 → 정확성·5방언 일관성·PG 이관함정·최적화/스키마 다차원 병렬 감사 → 검증 → 리포트 | 경로·글롭·PR·브랜치. 없으면 작업 트리의 SQL/매퍼/DDL |

## 구조

둘 다 **팬아웃 → 검증 → 요약** 파이프라인이다(단계 간 배리어 없음).

- `review-changes`: 분류 1개 → 파일별 리뷰 → 지적별 반박 검증 → 요약 1개.
  라우팅: java→`java-reviewer`, sql_mapper→`sql-pro`(+5방언·이관함정 프롬프트), react/vue/ts→각 리뷰어,
  migration·schema→`database-architect`. config·other는 생략.
- `sql-db-audit`: 수집 1개 → 파일별 4차원 병렬(correctness=`sql-pro`, dialect·pg_trap=기본 워커+스킬,
  optimize=`database-optimizer` 또는 ddl이면 schema=`database-architect`) → 지적별 검증 → 리포트 1개.

## 전제·주의

- **설치 전제**: 이 워크플로가 디스패치하는 에이전트(sql-pro·database-optimizer·database-architect 등)는
  모두 dev-toolkit에 함께 들어 있다. 플러그인을 설치하면 함께 해결된다.
- **규모(비용)**: 파일 수 × 차원 수만큼 에이전트가 늘어난다. Pro 기본 규모 가이드는 `small(<5)`이므로
  실제 변경 규모에서는 `/config`의 **Dynamic workflow size**를 `medium`/`large`로 올려야 한다.
  변경이 크면 경로·PR로 범위를 좁혀 호출하는 편이 좋다.
- **실행 승인**: 동적 워크플로우는 명시적 opt-in에서만 실행된다(프롬프트에서 요청하거나 커맨드로 실행).
  권한 규칙 `Workflow` 또는 `Workflow(review-changes)`로 허용할 수 있다.
- 자체 저작물(외부 내재화 아님).
