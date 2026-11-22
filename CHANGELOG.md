# CHANGELOG

릴리스마다 `## [마켓플레이스 버전] - 날짜` 섹션을 하나씩 추가한다. `scripts/release.py`는 이 섹션이 없으면 태그를 만들지 않는다.

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
