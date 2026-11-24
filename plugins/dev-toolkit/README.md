# dev-toolkit

Spring Boot·Java 백엔드와 DB 작업에 쓰는 범용 스킬·에이전트 묶음. 특정 회사·제품 정보는 넣지 않는다.

## 들어 있는 것
| 종류 | 이름 |
|---|---|
| 스킬: Java·DB (10) | springboot-patterns, springboot-security, springboot-tdd, springboot-verification, java-coding-standards, jpa-patterns, mybatis-patterns, mysql-patterns, postgres-patterns, database-migrations |
| 스킬: 레거시·품질 (4) | inherit-legacy-style(레거시 컨벤션 정리), change-impact(변경 영향도), module-regression(모듈 회귀 장부), click-path-audit(화면 동작 추적) |
| 스킬: 설계·협업 (6) | api-design, e2e-testing(Playwright), architecture-decision-records, git-workflow, intent-driven-development(인수 기준), conventional-commit-review(커밋 메시지) |
| 스킬: 개발 워크플로 (5) | systematic-debugging, test-driven-development, verification-before-completion, using-git-worktrees, finishing-a-development-branch (Superpowers) |
| 스킬: 도구 (3) | pypict(PICT 페어와이즈 테스트 설계), mcp-builder(MCP 서버 개발), web-artifacts-builder(React 단일 HTML 아티팩트) |
| 커맨드 (1) | `/dev-toolkit:test-coverage` — 커버리지 공백 분석과 테스트 생성 (JaCoCo·Jest·pytest 등) |
| 에이전트 (3) | java-reviewer, java-build-resolver, database-reviewer |
| 규칙 원본 | `rules-payload/` (java 4종 + common/security). 플러그인으로는 배포되지 않아 `core:setup`이 복사한다 |

## 설치
```
/plugin install dev-toolkit --marketplace myjun0731/claude-pro
```

## 출처
ECC(MIT), Anthropic Agent Skills(Apache 2.0), Superpowers(MIT), pypict-claude-skill(MIT), wshobson/agents(MIT)에서 가져왔다. 가져온 커밋, 바꾼 부분, 라이선스 원문은 `THIRD_PARTY_NOTICES.md`에 있다.
