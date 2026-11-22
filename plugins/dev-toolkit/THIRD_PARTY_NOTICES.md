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
