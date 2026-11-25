# allinone

내용은 없고 의존성만 있는 메타 플러그인. 이것 하나만 설치하면 아래가 함께 설치·활성화된다.

```
/plugin install allinone --marketplace myjun0731/claude-pro
```

설치한 뒤 `/core:setup`을 한 번 실행한다.

새 PC라면 먼저 공식 마켓플레이스가 등록돼 있어야 한다. `claude`를 대화형으로 한 번 실행하면 자동으로 등록되고, 바로 셸에서 설치하려면 아래를 먼저 실행한다.

```
claude plugin marketplace add anthropics/claude-plugins-official
```

이게 없으면 공식 플러그인이 설치되지 않고 allinone이 로드되지 않는다.

나중에 allinone에 의존성이 추가되면 업데이트만으로는 새 플러그인이 설치되지 않는다. 그때는 `claude plugin install <새 플러그인>@claude-pro`로 따로 설치한다.

| 플러그인 | 마켓플레이스 | 내용 |
|---|---|---|
| core | claude-pro | 비밀파일 가드·prettier 훅, 상태줄, /core:setup, 메모리 커맨드, 설정 정리·스킬 점검 스킬 |
| design-eng | claude-pro | 디자인·애니메이션 스킬 7종 (+ design-for-ai 의존성) |
| agentic | claude-pro | 에이전트 아키텍처·루프·파이프라인·보안 설계 스킬 12개 (외부 원본 내재화) |
| overkill | claude-pro (외부 원본) | 고급 대안 제시 |
| recursive-research | claude-pro (외부 원본) | 재귀 심층 조사 |
| dev-toolkit | claude-pro | Java·Spring·DB·레거시·설계·디버깅·TDD·PICT·MCP 스킬 48개, 동적 워크플로 10개, 커맨드 1개, 리뷰·구현 에이전트 16개 |
| pr-review-toolkit | claude-plugins-official | PR 리뷰 에이전트 6종 (오류 삼킴·주석·테스트·타입·단순화·품질) |
| feature-dev | claude-plugins-official | 기능 개발 워크플로: 코드 탐색·설계·리뷰 에이전트 |
| code-modernization | claude-plugins-official | 레거시 평가·비즈니스 규칙 추출·마이그레이션 계획 |
| security-guidance | claude-plugins-official | 편집 시 보안 경고, 종료 시 diff 보안 리뷰 |
| jdtls-lsp | claude-plugins-official | Java 언어 서버 (Eclipse JDT.LS 설치 필요) |
| context7 | claude-plugins-official | 라이브러리 최신 문서 조회 MCP |
| skill-creator | claude-plugins-official | 스킬 작성·평가 |
| playwright | claude-plugins-official | 브라우저 자동화 MCP |

## 참고
- Obsidian MCP는 API 키가 있어야 해서 넣지 않았다. 필요하면 `obsidian` 플러그인을 따로 설치한다.
- 공식 플러그인은 Anthropic 공식 마켓플레이스(`claude-plugins-official`)에서 받는다. Claude Code를 처음 실행하면 자동으로 등록되는 마켓플레이스다.
- 빼고 싶은 공식 플러그인이 있으면 `claude plugin disable <이름>`으로 끈다. 의존성이라 제거는 거부될 수 있다.
- `jdtls-lsp`는 PC에 Eclipse JDT.LS가 있어야 동작한다.
- `security-guidance`는 응답이 끝날 때마다 diff 보안 리뷰를 돌려 토큰이 더 든다.
