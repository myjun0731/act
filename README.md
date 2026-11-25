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

나중에 allinone에 의존성이 추가되면 업데이트만으로는 새 플러그인이 설치되지 않는다. 그때는 `claude plugin install <새 플러그인>@claude-pro`로 따로 설치한다.

## 채널/대상별 설치

애플 OS식 4단계 채널(개발자 베타 → 공개 베타 → RC → 정식)을 git 브랜치로 운영한다. 설치할 때 `#<ref>`로 채널을 고른다. 전체 운영은 `RELEASE.md` 참조.

| 대상 | 명령 | 채널 |
|---|---|---|
| 일반/안정 | `claude plugin marketplace add myjun0731/claude-pro` | 정식(main) |
| 공개 베타 | `claude plugin marketplace add myjun0731/claude-pro#beta` | 공개 베타 |
| RC 검증 | `claude plugin marketplace add myjun0731/claude-pro#rc` | RC |
| 메인테이너 | `claude plugin marketplace add myjun0731/claude-pro#dev` | 개발자 베타 |
| 특정 시드 고정 | `claude plugin marketplace add myjun0731/claude-pro#v1.11.0-rc.1` | 그 시드 |

- 무지정 설치는 기본 브랜치 `main` = 정식이다. 팀원은 `#beta`를 **명시**해야 공개 베타를 받는다.
- 브랜치 ref(`#beta` 등)는 그 채널의 새 시드를 계속 따라가고, 태그 ref(`#v…`)는 그 시드에 고정된다.
- 채널 전환: `claude plugin marketplace remove claude-pro` 후 다른 ref로 재추가(머신당 1채널).
- **강제가 아니라 규약이다** — 비공개 레포의 Read 협력자는 모든 브랜치를 볼 수 있어, 채널 구분은 이 설치 안내로 유도한다. 진짜 가림이 필요하면 dev 전용 별도 레포로 분리해야 한다.

| 플러그인 | 상태 | 내용 |
|---|---|---|
| allinone | 0.4.1 | 메타 플러그인: core·dev-toolkit·design-eng·agentic·overkill·recursive-research + 공식 플러그인 8종 |
| dev-toolkit | 0.10.3 | Java·Spring·DB·레거시·설계·협업·디버깅·TDD·PICT·MCP 스킬 48, 동적 워크플로 11, 리뷰·구현 에이전트 16, 커버리지 커맨드, 규칙 원본 |
| core | 0.4.0 | 비밀파일 가드·prettier 훅, 상태줄, /remember·/recall, /core:setup, 설정 정리·스킬 점검 스킬 4 |
| agentic | 0.3.0 | 에이전트 아키텍처·루프·파이프라인·보안 설계 스킬 12 (외부 원본 내재화, MIT) |
| design-eng | 0.1.1 | 디자인·애니메이션 스킬 7종, design-for-ai(외부 원본) 의존성 |
| overkill · recursive-research | 외부 | 원본 저장소를 커밋 고정으로 가리킴 (MIT) |
| obsidian | 0.1.2 | Obsidian MCP (API 키는 설치 시 입력, allinone 미포함) |

## 버전 관리

### 브랜치
애플 OS식 4단계 채널 = 브랜치. 자세한 운영은 `RELEASE.md`.

| 브랜치 | 채널 | 마켓 버전 | 용도 |
|---|---|---|---|
| `main` | 정식(GA) | `1.x.y` | 릴리스된 상태만. 무지정 설치·기본 브랜치 |
| `rc` | 릴리스 후보 | `1.x.y-rc.N` | 정식 직전 프리즈. 깨끗하면 그대로 main |
| `beta` | 공개 베타 | `1.x.y-beta.N` | 안정화. 팀원 대상 |
| `dev` | 개발자 베타 | `1.x.y-dev.N` | 평소 작업. 매 시드 발행 |

단계 접미사는 마켓 버전에만 붙고, 플러그인 버전은 평범한 semver다. 채널 격리는 브랜치가 담당한다.

### 태그
| 태그 | 예 | 쓰임 |
|---|---|---|
| `v<마켓플레이스 버전>` | `v1.0.0` | 저장소 전체 스냅샷. 특정 릴리스로 설치를 고정할 때 |
| `<플러그인>--v<플러그인 버전>` | `core--v0.2.0` | 플러그인별 버전. Claude Code가 의존성 버전 범위를 풀 때 이 형식을 본다 |

### 특정 릴리스로 설치하기
```
claude plugin marketplace add myjun0731/claude-pro#v1.11.0-rc.1
claude plugin install allinone@claude-pro
```
`#<ref>`를 빼면 기본 브랜치 `main`의 최신 정식을 따라간다. 채널은 위 "채널/대상별 설치" 표 참조.

### 릴리스 (채널형)
단계별 발행·승격은 `scripts/release.py --stage ...` 와 `scripts/promote.py` 로 한다. 브랜치 가드·버전 접미사·태그·prerelease/latest·CHANGELOG 규칙 등 **전체 절차는 `RELEASE.md`** 를 보라.
```
python scripts/release.py --stage dev-beta --push     # dev 시드 (1.x.y-dev.N)
python scripts/promote.py dev-to-beta --run           # dev → beta 승격
python scripts/release.py --stage public-beta --push  # beta 시드
python scripts/promote.py rc-to-ga --run              # rc → main 준비
python scripts/release.py --stage ga --push           # main 정식 (Latest)
```
`--push` 없이 실행하면 미리보기, `--tag`는 로컬 커밋·태그까지만. `ga`에서만 플러그인 버전 미증가를 막고 `<플러그인>--v<버전>` 태그를 만든다.

