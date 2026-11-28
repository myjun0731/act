# 제3자 고지 (Third-party notices)

## ECC (Everything Claude Code)
- 출처: https://github.com/affaan-m/ECC
- 가져온 커밋: `4adeee6732a12d1540f49a4d50a38ce8c97f9a53` (v2.2.3)
- 라이선스: MIT (아래 원문)

### 가져온 파일
- 스킬: `skills/springboot-patterns`, `skills/springboot-security`, `skills/springboot-tdd`, `skills/springboot-verification`, `skills/java-coding-standards`, `skills/jpa-patterns`, `skills/mybatis-patterns`, `skills/mysql-patterns`, `skills/postgres-patterns`, `skills/database-migrations`
- 스킬 (0.2.0에 추가, 같은 커밋): `skills/inherit-legacy-style`, `skills/change-impact`, `skills/module-regression`, `skills/click-path-audit`, `skills/api-design`, `skills/e2e-testing`, `skills/architecture-decision-records`, `skills/git-workflow`
- 스킬 (0.3.0에 추가, 같은 커밋): `skills/intent-driven-development`, `skills/conventional-commit-review`
- 커맨드 (0.3.0에 추가): `commands/test-coverage.md`
- 스킬 (0.11.0에 추가, 같은 커밋): `skills/coding-standards`, `skills/error-handling`, `skills/content-hash-cache-pattern`, `skills/latency-critical-systems`, `skills/code-tour`, `skills/terminal-opener` — 변경 내용은 ATTRIBUTION.md 6차 추가
- 스크립트 (0.12.1): `skills/config-health/scripts/` 4개(ECC 저장소 루트 `scripts/config-health.py`·`config_health_*.py`) — ATTRIBUTION.md
- 스킬 (W5, 같은 커밋): `skills/api-connector-builder`, `skills/codehealth-mcp`, `skills/web-research-mcp`(원본 `deep-research`), `skills/exa-search`, `skills/jira-integration`, `skills/knowledge-ops`, `skills/mailtrap-email-integration`, `skills/plankton-code-quality` — ATTRIBUTION.md 7차 추가
- 에이전트: `agents/java-reviewer.md`, `agents/java-build-resolver.md`, `agents/database-reviewer.md`
- 규칙: `rules/java/coding-style.md`, `rules/java/patterns.md`, `rules/java/security.md`, `rules/java/testing.md`, `rules/common/security.md` → `rules-payload/`에 보관

### 변경한 내용
- `agents/java-reviewer.md`: description의 "MUST BE USED for all Java code changes."를
  "Use when reviewing Java code changes."로 바꿈. 모든 Java 변경에 자동 위임되는 것을 막기 위함.
- 그 외 파일은 원본 그대로.

### 일부러 뺀 것
- `rules/java/hooks.md`, `rules/common/`의 security 외 파일: ECC 훅·에이전트를 전제로 하거나
  ("ALWAYS create new objects" 같은) 전역 강제 규칙이라 기존 코드베이스와 충돌할 수 있음.

### 원본 라이선스

```
MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Anthropic Agent Skills (0.4.0에 추가)
- 출처: https://github.com/anthropics/skills, 커밋 `e4bb5d960d87126ff3b3a8af1a104b7db67560ba`
- 라이선스: Apache License 2.0 (각 스킬 폴더의 `LICENSE.txt`)
- 가져온 파일: `skills/web-artifacts-builder`, `skills/mcp-builder` (원본 그대로)

## Superpowers (0.4.0에 추가)
- 출처: https://github.com/obra/superpowers, 커밋 `22f0b463e7a5e579904dd6211a520321035526f7`
- 라이선스: MIT, Copyright (c) 2025 Jesse Vincent (각 스킬 폴더의 `LICENSE`)
- 가져온 파일: `skills/finishing-a-development-branch`, `skills/systematic-debugging`, `skills/test-driven-development`,
  `skills/using-git-worktrees`, `skills/verification-before-completion`
- 변경: 다른 스킬을 가리키는 `superpowers:<이름>` 표기를 `dev-toolkit:<이름>`으로 바꿨다.
  `superpowers:writing-skills`는 이 플러그인에 없어서 공식 `skill-creator:skill-creator`로 바꿨다.
  ECC의 `skills/click-path-audit`에 있던 같은 표기도 함께 바꿨다.

## pypict-claude-skill (0.4.0에 추가)
- 출처: https://github.com/omkamal/pypict-claude-skill, 커밋 `fbda212bca79dfa7611be12527b102c89cc8faeb`
- 라이선스: MIT, Omar Kamal Hosney (`skills/pypict/LICENSE`)
- 가져온 파일: `SKILL.md`, `scripts/`, `references/`, `examples/` → `skills/pypict/` (원본 그대로)

## wshobson/agents (0.10.0에 추가)
- 출처: https://github.com/wshobson/agents, 커밋 `34e50fee32114afd9475f25d81492712f08cb71c` (2026-11-23)
- 라이선스: MIT, Copyright (c) 2024 Seth Hobson (아래 원문)

### 가져온 파일
- 에이전트: `agents/java-pro.md`, `agents/sql-pro.md`, `agents/database-architect.md`,
  `agents/database-optimizer.md`, `agents/legacy-modernizer.md`, `agents/test-automator.md`
- 스킬: `skills/postgresql-table-design`, `skills/sql-optimization-patterns`, `skills/database-migration`
  (각각 `SKILL.md` + `references/details.md`)

### 변경한 내용
- 에이전트 `name:`에서 원본의 플러그인 접두사를 제거했다
  (`database-design-database-architect` → `database-architect`,
  `database-migrations-database-optimizer` → `database-optimizer`,
  `framework-migration-legacy-modernizer` → `legacy-modernizer`,
  `unit-testing-test-automator` → `test-automator`).
  `java-pro`, `sql-pro`는 원본부터 접두사가 없었다.
- 스킬 frontmatter에 `metadata.origin: wshobson/agents`를 추가했다.
- 그 외 본문은 원본 그대로.

### 비고
- 원본은 같은 에이전트를 여러 플러그인에 중복 수록한다. `database-architect`는 `database-design`,
  `database-optimizer`는 `database-migrations`, `legacy-modernizer`는 `framework-migration`,
  `test-automator`는 `unit-testing` 변형을 가져왔다(변형 간 차이는 `name:`/`model:`뿐).
- `skills/database-migration`(단수)은 ECC에서 온 기존 `skills/database-migrations`(복수)와 이름이 비슷하다.
  전자는 ORM(Sequelize/TypeORM/Prisma) 마이그레이션 중심, 후자는 범용 스키마 마이그레이션 패턴.

### 원본 라이선스

```
MIT License

Copyright (c) 2024 Seth Hobson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
