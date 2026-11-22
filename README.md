# claude-pro

개인용 Claude Code 플러그인 마켓플레이스 (비공개).

```
/plugin install allinone --marketplace myjun0731/claude-pro
```

셸에서는 `claude plugin install allinone --marketplace https://github.com/myjun0731/claude-pro.git`

새 PC라면 먼저 공식 마켓플레이스가 등록돼 있어야 한다. `claude`를 대화형으로 한 번 실행하면 자동으로 등록되고, 바로 셸에서 설치하려면 아래를 먼저 실행한다.

```
claude plugin marketplace add anthropics/claude-plugins-official
```

이게 없으면 공식 플러그인이 설치되지 않고 allinone이 로드되지 않는다.

나중에 allinone에 의존성이 추가되면 업데이트만으로는 새 플러그인이 설치되지 않는다. 그때는 `claude plugin install <새 플러그인>@myoun-pro`로 따로 설치한다.

| 플러그인 | 상태 | 내용 |
|---|---|---|
| allinone | 0.3.0 | 메타 플러그인: core·dev-toolkit·design-eng·overkill·recursive-research + 공식 플러그인 8종 |
| dev-toolkit | 0.4.0 | Java·Spring·DB 10, 레거시·품질 4, 설계·협업 6, 개발 워크플로 5, 도구 3 스킬, 커버리지 커맨드, 리뷰 에이전트 3, 규칙 원본 |
| core | 0.2.0 | 비밀파일 가드·prettier 훅, 상태줄, /remember·/recall, /core:setup, 설정 정리·스킬 점검 스킬 4 |
| design-eng | 0.1.0 | 디자인·애니메이션 스킬 7종, design-for-ai(외부 원본) 의존성 |
| overkill · recursive-research | 외부 | 원본 저장소를 커밋 고정으로 가리킴 (MIT) |
| obsidian | 0.1.0 | Obsidian MCP (API 키는 설치 시 입력, allinone 미포함) |
