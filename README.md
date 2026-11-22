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

## 버전 관리

### 브랜치
| 브랜치 | 용도 |
|---|---|
| `main` | 릴리스된 상태만 둔다. 설치·자동 업데이트가 따라가는 기본 브랜치 |
| `dev` | 평소 작업. 다 되면 `main`에 합친 뒤 릴리스한다 |

### 태그
| 태그 | 예 | 쓰임 |
|---|---|---|
| `v<마켓플레이스 버전>` | `v1.0.0` | 저장소 전체 스냅샷. 특정 릴리스로 설치를 고정할 때 |
| `<플러그인>--v<플러그인 버전>` | `core--v0.2.0` | 플러그인별 버전. Claude Code가 의존성 버전 범위를 풀 때 이 형식을 본다 |

### 특정 릴리스로 설치하기
```
claude plugin marketplace add myjun0731/claude-pro@v1.0.0
claude plugin install allinone@myoun-pro
```
`@v1.0.0`을 빼면 `main`의 최신 상태를 따라간다.

### 릴리스 순서
1. `dev`에서 작업하고 커밋한다.
2. 바뀐 플러그인의 `plugin.json` `version`을 올린다.
3. `.claude-plugin/marketplace.json`의 `metadata.version`을 올리고, `CHANGELOG.md`에 `## [새 버전] - 날짜` 섹션을 쓴다.
4. `main`에 합치고 push한다: `git checkout main`, `git merge --ff-only dev`, `git push`
5. `python scripts/release.py`로 미리보기 → `python scripts/release.py --push`로 태그 생성·push
   - GitHub CLI(`gh`)에 로그인돼 있으면 CHANGELOG의 그 버전 섹션으로 GitHub Release도 만들고 Latest로 표시한다.

`release.py`는 다음 경우 태그를 만들지 않고 멈춘다.
- `main`이 아니거나, 커밋하지 않은 변경이 있거나, `origin/main`과 다를 때
- 플러그인 내용이 바뀌었는데 그 플러그인의 `version`을 안 올렸을 때
- `CHANGELOG.md`에 이번 버전 섹션이 없을 때
- `claude plugin validate`가 실패할 때

